// screens/MyAreaReportsScreen.js
// Pantalla para que secretarios y directores vean los reportes de sus áreas
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import ShimmerEffect from '../components/ShimmerEffect';
import { subscribeToAreaReports, subscribeToMyReports, rateTaskReport, deleteTaskReport } from '../services/reportsService';
import { hapticSuccess, hapticWarning } from '../utils/haptics';
import { getDireccionesBySecretaria } from '../config/areas';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';

const MyAreaReportsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { showError, showSuccess } = useNotification();
  const { currentUser } = useTasks();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'mine', 'team'
  const [loadError, setLoadError] = useState(false);

  const unsubscribeRef = React.useRef(null);

  const onSubError = useCallback(() => {
    setLoadError(true);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Re-suscribir cuando el usuario del contexto esté disponible
  useEffect(() => {
    if (!currentUser) return;
    setLoadError(false);

    const userRole = currentUser.role;
    const userEmail = currentUser.email;

    // Limpiar suscripción anterior
    if (unsubscribeRef.current) unsubscribeRef.current();

    if (userRole === 'secretario') {
      const direccionesOficiales = getDireccionesBySecretaria(currentUser.area || '');
      const areasFirebase = currentUser.areasPermitidas || [];
      const todasAreas = [...new Set([
        currentUser.area,
        ...direccionesOficiales,
        ...areasFirebase
      ])].filter(Boolean);

      unsubscribeRef.current = subscribeToAreaReports(todasAreas, (data) => {
        setReports(data);
        setLoading(false);
        setRefreshing(false);
      }, onSubError);
    } else if (userRole === 'director') {
      unsubscribeRef.current = subscribeToAreaReports([currentUser.area], (data) => {
        setReports(data);
        setLoading(false);
        setRefreshing(false);
      }, onSubError);
    } else {
      unsubscribeRef.current = subscribeToMyReports(userEmail, (data) => {
        setReports(data);
        setLoading(false);
        setRefreshing(false);
      }, onSubError);
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [currentUser, onSubError]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // La re-suscripción es automática; solo mostrar el indicador brevemente
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const getFilteredReports = () => {
    if (!currentUser) return reports;
    
    const userEmail = currentUser.email?.toLowerCase().trim() || '';
    
    if (filter === 'mine') {
      return reports.filter(r => r.createdBy?.toLowerCase().trim() === userEmail);
    } else if (filter === 'team') {
      return reports.filter(r => r.createdBy?.toLowerCase().trim() !== userEmail);
    }
    return reports;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      director: theme.info,
      secretario: theme.secondary,
      admin: theme.warning,
    };
    return colors[role] || theme.textMuted;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Sin fecha';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRateReport = useCallback(async (reportId, taskId, rating) => {
    hapticSuccess();
    try {
      await rateTaskReport(taskId, reportId, rating, '', currentUser?.userId);
      showSuccess(`Reporte calificado con ${rating} estrellas`);
      setShowModal(false);
    } catch (error) {
      hapticWarning();
      showError('Error al calificar el reporte');
    }
  }, [currentUser, showSuccess, showError]);

  const handleDeleteReport = useCallback(async (reportId, taskId) => {
    const doDelete = async () => {
      try {
        await deleteTaskReport(taskId, reportId);
        showSuccess('Reporte eliminado correctamente');
        setShowModal(false);
      } catch (error) {
        showError(`Error: ${error.message}`);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('¿Estás seguro de que deseas eliminar este reporte?');
      if (confirmed) {
        await doDelete();
      }
    } else {
      Alert.alert(
        '🗑️ Eliminar Reporte',
        '¿Estás seguro de que deseas eliminar este reporte? Esta acción no se puede deshacer.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: doDelete }
        ]
      );
    }
  }, [showSuccess, showError]);

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => interactive && onRate && onRate(star)}
          >
            <Ionicons
              name={star <= (rating || 0) ? 'star' : 'star-outline'}
              size={interactive ? 32 : 18}
              color={star <= (rating || 0) ? theme.warning : theme.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const canRateReport = () => {
    // Solo secretarios pueden calificar reportes
    return currentUser?.role === 'secretario' || currentUser?.role === 'admin';
  };

  const renderReportCard = useCallback(({ item }) => {
    const isMyReport = item.createdBy?.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim();

    return (
      <TouchableOpacity
        style={[
          styles.reportCard,
          { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' },
          isMyReport && styles.myReportCard
        ]}
        onPress={() => {
          setSelectedReport(item);
          setShowModal(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Reporte: ${item.title}${isMyReport ? ', tuyo' : ''}${item.rating ? `, calificado con ${item.rating} estrellas` : ', pendiente'}`}
      >
        <View style={styles.reportHeader}>
          <View style={styles.reportTitleRow}>
            <Text style={[styles.reportTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.rating > 0 && renderStars(item.rating)}
          </View>
          {isMyReport && (
            <View style={[styles.myBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.myBadgeText}>Mi reporte</Text>
            </View>
          )}
        </View>

        <Text style={[styles.reportDescription, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.reportMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color={theme.primary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {item.createdByName}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={14} color={theme.primary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.createdByArea || item.area || 'Sin área'}
            </Text>
          </View>
        </View>

        <View style={styles.reportFooter}>
          <Text style={[styles.taskLabel, { color: theme.textTertiary || theme.textSecondary }]}>
            Tarea: {item.taskInfo?.title || 'Sin título'}
          </Text>
          <Text style={[styles.dateText, { color: theme.textTertiary || theme.textSecondary }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        {item.images && item.images.length > 0 && (
          <View style={styles.imagesPreview}>
            <Ionicons name="images-outline" size={14} color={theme.primary} />
            <Text style={[styles.imagesCount, { color: theme.primary }]}>
              {item.images.length} imagen(es)
            </Text>
          </View>
        )}

        {!item.rating && canRateReport() && !isMyReport && (
          <View style={[styles.pendingBadge, { backgroundColor: theme.error }]}>
            <Text style={styles.pendingText}>Por calificar</Text>
          </View>
        )}
      </TouchableOpacity>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, theme, currentUser, setSelectedReport, setShowModal]);

  const renderDetailModal = () => {
    if (!selectedReport) return null;
    const isMyReport = selectedReport.createdBy?.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim();

    return (
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : 'rgba(255,255,255,0.98)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)', borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Detalle del Reporte
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>
                {selectedReport.title}
              </Text>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Enviado por</Text>
                <View style={styles.senderInfo}>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(selectedReport.createdByRole) }]}>
                    <Text style={styles.roleBadgeText}>
                      {selectedReport.createdByRole === 'director' ? 'Director' : 
                       selectedReport.createdByRole === 'secretario' ? 'Secretario' : 
                       selectedReport.createdByRole || 'Usuario'}
                    </Text>
                  </View>
                  <Text style={[styles.senderName, { color: theme.text }]}>
                    {selectedReport.createdByName}
                  </Text>
                </View>
                <Text style={[styles.senderArea, { color: theme.textSecondary }]}>
                  {selectedReport.createdByArea || selectedReport.area}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Descripción</Text>
                <Text style={[styles.detailDescription, { color: theme.text }]}>
                  {selectedReport.description}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Tarea relacionada</Text>
                <TouchableOpacity
                  style={[styles.taskLink, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}
                  onPress={() => {
                    setShowModal(false);
                    navigation.navigate('TaskReportsAndActivity', {
                      taskId: selectedReport.taskId,
                      taskTitle: selectedReport.taskInfo?.title || 'Tarea'
                    });
                  }}
                >
                  <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                  <Text style={[styles.taskLinkText, { color: theme.primary }]}>
                    {selectedReport.taskInfo?.title || 'Ver tarea'}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedReport.images && selectedReport.images.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Imágenes ({selectedReport.images.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedReport.images.map((img, index) => {
                      const imageUri = typeof img === 'string' ? img : (img.url || img.uri || img.dataUrl);
                      if (!imageUri) return null;
                      return (
                        <Image
                          key={index}
                          source={{ uri: imageUri }}
                          style={styles.previewImage}
                        />
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Calificación</Text>
                {selectedReport.rating ? (
                  <View style={styles.ratingDisplay}>
                    {renderStars(selectedReport.rating)}
                    <Text style={[styles.ratingText, { color: theme.text }]}>
                      {selectedReport.rating} / 5
                    </Text>
                  </View>
                ) : canRateReport() && !isMyReport ? (
                  <View>
                    <Text style={[styles.ratePrompt, { color: theme.textSecondary }]}>
                      Calificar este reporte:
                    </Text>
                    {renderStars(0, true, (rating) => 
                      handleRateReport(selectedReport.id, selectedReport.taskId, rating)
                    )}
                  </View>
                ) : (
                  <Text style={[styles.pendingRating, { color: theme.textTertiary || theme.textSecondary }]}>
                    {isMyReport ? 'Esperando calificación' : 'Sin calificar'}
                  </Text>
                )}
              </View>

              {/* Botón de eliminar reportes */}
              <View style={styles.detailSection}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteReport(selectedReport.id, selectedReport.taskId)}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.error} />
                  <Text style={styles.deleteButtonText}>Eliminar este reporte</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'web' ? 16 : 48,
      paddingBottom: 24,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
      overflow: 'hidden',
    },
    backButton: {
      marginRight: 12,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      flex: 1,
      textShadowColor: 'rgba(0,0,0,0.20)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    roleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    roleText: {
      fontSize: 11,
      color: '#fff',
      fontWeight: '600',
      marginLeft: 4,
    },
    statsRow: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#fff',
    },
    statLabel: {
      fontSize: 11,
      color: '#fff',
      opacity: 0.9,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    filterButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '500',
    },
    reportCard: {
      margin: 8,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    myReportCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    reportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    reportTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    reportTitle: {
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
    },
    myBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    myBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    roleBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    reportDescription: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    reportMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 8,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
    },
    reportFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    taskLabel: {
      fontSize: 12,
      flex: 1,
    },
    dateText: {
      fontSize: 11,
    },
    imagesPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    imagesCount: {
      fontSize: 12,
    },
    pendingBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    pendingText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 2,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    emptyIconWrapper: {
      width: 88,
      height: 88,
      borderRadius: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    modalBody: {
      padding: 16,
    },
    detailTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    detailSection: {
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    senderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    senderName: {
      fontSize: 16,
      fontWeight: '500',
    },
    senderArea: {
      fontSize: 14,
    },
    detailDescription: {
      fontSize: 15,
      lineHeight: 22,
    },
    taskLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 8,
    },
    taskLinkText: {
      fontSize: 14,
      fontWeight: '500',
    },
    previewImage: {
      width: 120,
      height: 120,
      borderRadius: 8,
      marginRight: 8,
    },
    ratingDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    ratingText: {
      fontSize: 16,
      fontWeight: '600',
    },
    ratePrompt: {
      marginBottom: 12,
    },
    pendingRating: {
      fontStyle: 'italic',
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.error,
      backgroundColor: theme.errorAlpha,
    },
    deleteButtonText: {
      color: theme.error,
      fontSize: 16,
      fontWeight: '600',
    },
  }), [isDark, theme]);

  // ⚠️ Hooks DEBEN ir antes de cualquier return condicional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredReports = useMemo(() => getFilteredReports(), [reports, filter, currentUser]);

  const reportStats = useMemo(() => {
    const userEmail = currentUser?.email?.toLowerCase().trim() || '';
    const myReports = reports.filter(r => r.createdBy?.toLowerCase().trim() === userEmail).length;
    return {
      myReports,
      teamReports: reports.length - myReports,
      pendingCount: reports.filter(r => !r.rating).length,
    };
  }, [reports, currentUser]);

  const { myReports, teamReports, pendingCount } = reportStats;

  if (loading) {
    return (
      <View style={[styles.container, { paddingHorizontal: 16, paddingTop: 60 }]}>
        {[...Array(5)].map((_, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <ShimmerEffect width="100%" height={100} borderRadius={12} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { shadowColor: theme.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Volver" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportes de Mi Área</Text>
        <View style={[styles.roleInfo, { backgroundColor: getRoleBadgeColor(currentUser?.role) }]}>
          <Ionicons
            name={currentUser?.role === 'secretario' ? 'briefcase' : 'person'}
            size={12}
            color="#fff"
          />
          <Text style={styles.roleText}>
            {currentUser?.role === 'secretario' ? 'Secretario' :
             currentUser?.role === 'director' ? 'Director' : 'Usuario'}
          </Text>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.statNumber}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.info }]}>
          <Text style={styles.statNumber}>{myReports}</Text>
          <Text style={styles.statLabel}>Míos</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.success }]}>
          <Text style={styles.statNumber}>{teamReports}</Text>
          <Text style={styles.statLabel}>Equipo</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.error }]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {['all', 'mine', 'team'].map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
              { borderColor: theme.border }
            ]}
            onPress={() => setFilter(f)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === f }}
            accessibilityLabel={f === 'all' ? 'Todos los reportes' : f === 'mine' ? 'Mis reportes' : 'Reportes del equipo'}
          >
            <Text style={[
              styles.filterText,
              { color: filter === f ? '#fff' : (theme.textSecondary) }
            ]}>
              {f === 'all' ? 'Todos' : f === 'mine' ? 'Mis reportes' : 'Del equipo'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reports List */}
      {loadError ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: theme.errorAlpha }]}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.error} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Error de conexión</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No se pudieron cargar los reportes.</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}>
            <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {filter === 'mine' ? 'Sin reportes propios' :
             filter === 'team' ? 'Sin reportes del equipo' :
             'Sin reportes'}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {filter === 'mine' ? 'Aún no has enviado reportes.\nCrea uno desde una tarea asignada.' :
             filter === 'team' ? 'Tu equipo no ha enviado reportes aún.' :
             'No hay reportes disponibles.\nAjusta los filtros para ver más resultados.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={renderReportCard}
          contentContainerStyle={{ paddingBottom: 20 }}
          windowSize={5}
          maxToRenderPerBatch={5}
          initialNumToRender={6}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
        />
      )}

      {renderDetailModal()}
    </View>
  );
};

export default MyAreaReportsScreen;
