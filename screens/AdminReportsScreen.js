// screens/AdminReportsScreen.js
// Pantalla para ver todos los reportes de directores y secretarios
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ShimmerEffect from '../components/ShimmerEffect';
import { subscribeToAllReports, rateTaskReport, deleteTaskReport } from '../services/reportsService';
import { hapticSuccess, hapticWarning } from '../utils/haptics';
import { toMs } from '../utils/dateUtils';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';

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
    setRefreshing(true);
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
      director: '#3498db',
      secretario: '#9b59b6',
      operativo: '#2ecc71',
      admin: '#f39c12',
    };
    return colors[role] || '#95a5a6';
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
              color={star <= (rating || 0) ? '#f1c40f' : '#ccc'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReportCard = useCallback(({ item }) => (
    <TouchableOpacity
      style={[styles.reportCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
      onPress={() => {
        setSelectedReport(item);
        setShowModal(true);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Reporte: ${item.title}${item.rating ? `, calificado con ${item.rating} estrellas` : ', pendiente de calificación'}`}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleRow}>
          <Text style={[styles.reportTitle, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
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

      <Text style={[styles.reportDescription, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.reportMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={14} color={theme.primary} />
          <Text style={[styles.metaText, { color: isDark ? '#aaa' : '#666' }]}>
            {item.createdByName}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="business-outline" size={14} color={theme.primary} />
          <Text style={[styles.metaText, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
            {item.createdByArea || item.area || 'Sin área'}
          </Text>
        </View>
      </View>

      <View style={styles.reportFooter}>
        <Text style={[styles.taskLabel, { color: isDark ? '#888' : '#999' }]}>
          Tarea: {item.taskInfo?.title || 'Sin título'}
        </Text>
        <Text style={[styles.dateText, { color: isDark ? '#666' : '#999' }]}>
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
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>Pendiente de calificar</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [isDark, theme, setSelectedReport, setShowModal]);

  const renderGroupHeader = (title, count) => (
    <View style={[styles.groupHeader, { backgroundColor: isDark ? '#111' : '#f0f0f0' }]}>
      <Text style={[styles.groupTitle, { color: isDark ? '#fff' : '#333' }]}>{title}</Text>
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
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>
                Detalle del Reporte
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                accessibilityLabel="Cerrar detalle"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={28} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.detailTitle, { color: isDark ? '#fff' : '#000' }]}>
                {selectedReport.title}
              </Text>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#666' }]}>Enviado por</Text>
                <View style={styles.senderInfo}>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(selectedReport.createdByRole) }]}>
                    <Text style={styles.roleBadgeText}>
                      {selectedReport.createdByRole === 'director' ? 'Director' : 
                       selectedReport.createdByRole === 'secretario' ? 'Secretario' : 
                       selectedReport.createdByRole || 'Usuario'}
                    </Text>
                  </View>
                  <Text style={[styles.senderName, { color: isDark ? '#fff' : '#333' }]}>
                    {selectedReport.createdByName}
                  </Text>
                </View>
                <Text style={[styles.senderArea, { color: isDark ? '#aaa' : '#666' }]}>
                  {selectedReport.createdByArea || selectedReport.area}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#666' }]}>Descripción</Text>
                <Text style={[styles.detailDescription, { color: isDark ? '#ccc' : '#333' }]}>
                  {selectedReport.description}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#666' }]}>Tarea relacionada</Text>
                <TouchableOpacity
                  style={[styles.taskLink, { backgroundColor: isDark ? '#333' : '#f5f5f5' }]}
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
                  <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#666' }]}>
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
                <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#666' }]}>Calificación</Text>
                {selectedReport.rating ? (
                  <View style={styles.ratingDisplay}>
                    {renderStars(selectedReport.rating)}
                    <Text style={[styles.ratingText, { color: isDark ? '#fff' : '#333' }]}>
                      {selectedReport.rating} / 5
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={[styles.ratePrompt, { color: isDark ? '#aaa' : '#666' }]}>
                      Calificar este reporte:
                    </Text>
                    {renderStars(0, true, (rating) => 
                      handleRateReport(selectedReport.id, selectedReport.taskId, rating)
                    )}
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#666' }]}>Fecha</Text>
                <Text style={[styles.dateDetail, { color: isDark ? '#ccc' : '#333' }]}>
                  {formatDate(selectedReport.createdAt)}
                </Text>
              </View>

              {/* Botón de eliminar reportes */}
              <View style={styles.detailSection}>
                <TouchableOpacity
                  style={[styles.deleteButton, { borderColor: '#E53935' }]}
                  onPress={() => handleDeleteReport(selectedReport.id, selectedReport.taskId)}
                >
                  <Ionicons name="trash-outline" size={20} color="#E53935" />
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
      backgroundColor: isDark ? '#000' : '#f5f5f5',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#e0e0e0',
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
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
      color: isDark ? '#888' : '#666',
    },
    groupByButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: isDark ? '#333' : '#e0e0e0',
    },
    groupByButtonActive: {
      backgroundColor: theme.primary,
    },
    groupByText: {
      fontSize: 12,
      color: isDark ? '#fff' : '#333',
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
      borderTopColor: isDark ? '#333' : '#eee',
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
      backgroundColor: '#e74c3c',
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
      borderBottomColor: isDark ? '#333' : '#eee',
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
      borderColor: '#E53935',
      backgroundColor: isDark ? '#3a2422' : '#ffebee',
    },
    deleteButtonText: {
      color: '#E53935',
      fontSize: 16,
      fontWeight: '600',
    },
  }), [isDark, theme]);

  // ⚠️ Hooks DEBEN ir antes de cualquier return condicional
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
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      <View style={styles.innerContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Volver" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportes de Áreas</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.statNumber}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#e74c3c' }]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#2ecc71' }]}>
          <Text style={styles.statNumber}>{ratedCount}</Text>
          <Text style={styles.statLabel}>Calificados</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f1c40f' }]}>
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
              { borderColor: isDark ? '#444' : '#ddd' }
            ]}
            onPress={() => setFilter(f)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === f }}
            accessibilityLabel={f === 'all' ? 'Todos los reportes' : f === 'pending' ? 'Reportes pendientes' : 'Reportes calificados'}
          >
            <Text style={[
              styles.filterText,
              { color: filter === f ? '#fff' : (isDark ? '#aaa' : '#666') }
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
          <View style={[styles.emptyIconWrapper, { backgroundColor: isDark ? '#1E1E22' : '#FFF0EE' }]}>
            <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Error de conexión</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No se pudieron cargar los reportes.</Text>
        </View>
      ) : groupedReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: isDark ? '#1E1E22' : '#F5F5F7' }]}>
            <Ionicons name="document-text-outline" size={48} color={isDark ? '#444' : '#C7C7CC'} />
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
