// screens/AdminReportsScreen.js
// Pantalla para ver todos los reportes de directores y secretarios
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { confirmAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ShimmerEffect from '../components/ShimmerEffect';
import { subscribeToAllReports, rateTaskReport, deleteTaskReport } from '../services/reportsService';
import { filterVisibleReports } from '../utils/taskVisibility';
import { hapticSuccess, hapticWarning } from '../utils/haptics';
import { toMs } from '../utils/dateUtils';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import ScreenHeader from '../components/ui/ScreenHeader';
import EmptyState from '../components/EmptyState';
import { syncPendingOperations } from '../services/offlineSync';
import { createStyles } from './reports/AdminReportsScreenStyles';

// `embedded`: se muestra como pestaña dentro de Reportes, sin encabezado propio
const AdminReportsScreen = ({ navigation, embedded = false }) => {
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const { showSuccess, showError } = useNotification();
  const { currentUser, tasks } = useTasks();
  const [allReports, setReports] = useState([]);
  // Pantalla del administrador. Si otro rol llegara a abrirla, solo ve lo que le corresponde.
  const reports = useMemo(
    () => (currentUser?.role === 'admin' ? allReports : filterVisibleReports(allReports, tasks, currentUser)),
    [allReports, tasks, currentUser]
  );
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
    // Los datos llegan en tiempo real; el gesto envía lo que quedó pendiente sin conexión
    syncPendingOperations().catch(() => {}).finally(() => setRefreshing(false));
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

    confirmAlert(
      'Eliminar reporte',
      '¿Estás seguro de que deseas eliminar este reporte? Esta acción no se puede deshacer.',
      doDelete,
      'Eliminar'
    );
  }, [showSuccess, showError]);

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            disabled={!interactive}
            onPress={() => interactive && onRate && onRate(star)}
            accessibilityRole="button"
            accessibilityLabel="Calificar"
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
      style={[styles.reportCard, { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder }]}
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
          <View style={[styles.modalContent, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : 'rgba(255,255,255,0.98)', borderColor: theme.glassBorder, borderWidth: 1 }]}>
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
                        <TouchableOpacity accessibilityRole="imagebutton" accessibilityLabel="Ver imagen"
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

  const styles = useMemo(() => createStyles(theme), [theme]);

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      <View style={styles.innerContainer}>
      {!embedded && <ScreenHeader title="Reportes de áreas" onBack={() => navigation.goBack()} />}

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
            <EmptyState
              icon="document-text-outline"
              title="Sin reportes"
              message="No hay reportes que coincidan con los filtros seleccionados."
            />
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
