// screens/AdminReportsScreen.js
// Pantalla para ver todos los reportes de directores y secretarios
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
import { subscribeToAllReports, rateTaskReport, deleteTaskReport } from '../services/reportsService';
import { hapticSuccess, hapticWarning } from '../utils/haptics';
import { toMs } from '../utils/dateUtils';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import AmbientOrbs from '../components/AmbientOrbs';

const AdminReportsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const { showSuccess, showError } = useNotification();
  const { currentUser } = useTasks();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'rated'
  const [groupBy, setGroupBy] = useState('area'); // 'area', 'role', 'date'
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
    const unsubscribe = subscribeToAllReports(
      (data) => {
        setReports(data);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setLoadError(true);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const onRefresh = useCallback(() => {
    // Con onSnapshot los datos ya son en tiempo real —
    // solo reseteamos el indicador visual tras un breve delay
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const getFilteredReports = () => {
    let filtered = [...reports];
    
    if (filter === 'pending') {
      filtered = filtered.filter(r => !r.rating);
    } else if (filter === 'rated') {
      filtered = filtered.filter(r => r.rating);
    }

    return filtered;
  };

  const getGroupedReports = () => {
    const filtered = getFilteredReports();
    const grouped = {};

    filtered.forEach(report => {
      let key;
      if (groupBy === 'area') {
        key = report.area || report.taskInfo?.area || 'Sin área';
      } else if (groupBy === 'role') {
        key = getRoleLabel(report.createdByRole);
      } else {
        // Por fecha
        const date = new Date(toMs(report.createdAt));
        key = date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(report);
    });

    // Convertir a array ordenado
    return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  };

  const getRoleLabel = (role) => {
    const labels = {
      director: 'Directores',
      secretario: 'Secretarios',
      operativo: 'Operativos',
      admin: 'Administradores',
    };
    return labels[role] || 'Otros';
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      director: theme.info,
      secretario: theme.secondary,
      operativo: theme.success,
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
      Alert.alert('Error', 'No se pudo calificar el reporte');
    }
  }, [currentUser, showSuccess]);

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
        'Eliminar Reporte',
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

  const renderReportCard = useCallback(({ item }) => (
    <TouchableOpacity
      style={[styles.reportCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.90)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}
      onPress={() => {
        setSelectedReport(item);
        setShowModal(true);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Reporte: ${item.title}${item.rating ? `, calificado con ${item.rating} estrellas` : ', pendiente de calificación'}`}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleRow}>
          <Text style={[styles.reportTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.rating > 0 && renderStars(item.rating)}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.createdByRole) }]}>
          <Text style={styles.roleBadgeText}>
            {item.createdByRole === 'director' ? 'Director' : 
             item.createdByRole === 'secretario' ? 'Secretario' : 
             item.createdByRole || 'Usuario'}
          </Text>
        </View>
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

      {!item.rating && (
        <View style={[styles.pendingBadge, { backgroundColor: theme.error }]}>
          <Text style={styles.pendingText}>Pendiente de calificar</Text>
        </View>
      )}
    </TouchableOpacity>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [isDark, theme, setSelectedReport, setShowModal]);

  const renderGroupHeader = (title, count) => (
    <View style={[styles.groupHeader, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}>
      <Text style={[styles.groupTitle, { color: theme.text }]}>{title}</Text>
      <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );

  const renderDetailModal = () => {
    if (!selectedReport) return null;

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
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                accessibilityLabel="Cerrar detalle"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
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
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            setSelectedImage(imageUri);
                            setShowImageModal(true);
                          }}
                        >
                          <Image
                            source={{ uri: imageUri }}
                            style={styles.previewImage}
                          />
                        </TouchableOpacity>
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
                ) : (
                  <View>
                    <Text style={[styles.ratePrompt, { color: theme.textSecondary }]}>
                      Calificar este reporte:
                    </Text>
                    {renderStars(0, true, (rating) => 
                      handleRateReport(selectedReport.id, selectedReport.taskId, rating)
                    )}
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Fecha</Text>
                <Text style={[styles.dateDetail, { color: theme.text }]}>
                  {formatDate(selectedReport.createdAt)}
                </Text>
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
    },
    contentWrapper: {
      flex: 1,
      alignSelf: 'center',
      width: '100%',
    },
    innerContainer: {
      flex: 1,
      backgroundColor: 'transparent',
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
      textShadowColor: 'rgba(0,0,0,0.20)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
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
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
    statLabel: {
      fontSize: 12,
      color: '#fff',
      opacity: 0.9,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 8,
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
    groupByRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 12,
      alignItems: 'center',
      gap: 8,
    },
    groupByLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    groupByButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.border,
    },
    groupByButtonActive: {
      backgroundColor: theme.primary,
    },
    groupByText: {
      fontSize: 12,
      color: theme.text,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      marginTop: 8,
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    countBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    countText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
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
    imageModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageModalCloseButton: {
      position: 'absolute',
      top: 20,
      right: 20,
      zIndex: 1000,
      padding: 8,
    },
    fullscreenImage: {
      width: '100%',
      height: '100%',
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
    dateDetail: {
      fontSize: 15,
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
  const groupedReports = useMemo(() => getGroupedReports(), [reports, filter, groupBy]);
  const { pendingCount, ratedCount, avgRating } = useMemo(() => {
    const rated = reports.filter(r => r.rating);
    const pending = reports.filter(r => !r.rating);
    const avg = rated.length > 0
      ? (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(1)
      : 0;
    return { pendingCount: pending.length, ratedCount: rated.length, avgRating: avg };
  }, [reports]);

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
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <AmbientOrbs intensity="medium" />
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      <View style={styles.innerContainer}>
      <LinearGradient colors={theme.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { shadowColor: theme.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Volver" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportes de Áreas</Text>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.statNumber}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.error }]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.success }]}>
          <Text style={styles.statNumber}>{ratedCount}</Text>
          <Text style={styles.statLabel}>Calificados</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.warning }]}>
          <Text style={styles.statNumber}>{avgRating}</Text>
          <Text style={styles.statLabel}>Promedio</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {['all', 'pending', 'rated'].map(f => (
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
            accessibilityLabel={f === 'all' ? 'Todos los reportes' : f === 'pending' ? 'Reportes pendientes' : 'Reportes calificados'}
          >
            <Text style={[
              styles.filterText,
              { color: filter === f ? '#fff' : (theme.textSecondary) }
            ]}>
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Calificados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Group By */}
      <View style={styles.groupByRow}>
        <Text style={styles.groupByLabel}>Agrupar por:</Text>
        {['area', 'role', 'date'].map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.groupByButton, groupBy === g && styles.groupByButtonActive]}
            onPress={() => setGroupBy(g)}
          >
            <Text style={[styles.groupByText, groupBy === g && { color: '#fff' }]}>
              {g === 'area' ? 'Área' : g === 'role' ? 'Rol' : 'Fecha'}
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
      ) : groupedReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}>
            <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin reportes</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No hay reportes para mostrar.{'\n'}Ajusta los filtros para ver más resultados.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedReports}
          keyExtractor={([key]) => key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
              <Ionicons name="document-text-outline" size={52} color={theme.textMuted} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>
                Sin reportes
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', paddingHorizontal: 40 }}>
                No hay reportes que coincidan con los filtros seleccionados
              </Text>
            </View>
          }
          windowSize={5}
          maxToRenderPerBatch={4}
          initialNumToRender={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={100}
          renderItem={({ item: [groupName, groupReports] }) => (
            <View>
              {renderGroupHeader(groupName, groupReports.length)}
              {groupReports.map(report => (
                <View key={report.id}>
                  {renderReportCard({ item: report })}
                </View>
              ))}
            </View>
          )}
        />
      )}

      </View>{/* end innerContainer */}
      </View>{/* end contentWrapper */}

      {renderDetailModal()}

      {/* Modal de imagen a pantalla completa */}
      <Modal
        visible={showImageModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseButton}
            onPress={() => setShowImageModal(false)}
            accessibilityLabel="Cerrar imagen"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

    </View>
  );
};

export default AdminReportsScreen;
