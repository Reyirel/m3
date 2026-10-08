// screens/MyAreaReportsScreen.js
// Pantalla para que secretarios y directores vean los reportes de sus áreas
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
} from 'react-native';
import { confirmAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ShimmerEffect from '../components/ShimmerEffect';
import { subscribeToReports, rateTaskReport, deleteTaskReport } from '../services/reportsService';
import { hapticSuccess, hapticWarning } from '../utils/haptics';
import { filterVisibleReports } from '../utils/taskVisibility';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';
import ScreenHeader from '../components/ui/ScreenHeader';
import { roleLabel } from '../services/permissions';
import EmptyState from '../components/EmptyState';
import { syncPendingOperations } from '../services/offlineSync';
import { createStyles } from './reports/MyAreaReportsScreenStyles';

// `embedded`: se muestra como pestaña dentro de Reportes, sin encabezado propio
const MyAreaReportsScreen = ({ navigation, embedded = false }) => {
  const { theme, isDark } = useTheme();
  const { showError, showSuccess } = useNotification();
  const { currentUser, tasks } = useTasks();
  const [allReports, setAllReports] = useState([]);
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

    // Limpiar suscripción anterior
    if (unsubscribeRef.current) unsubscribeRef.current();

    unsubscribeRef.current = subscribeToReports((data) => {
      setAllReports(data);
      setLoading(false);
      setRefreshing(false);
    }, onSubError);

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [currentUser, onSubError]);

  // Cada rol ve solo lo que le corresponde (misma regla que las tareas):
  //   secretario → reportes de las tareas de su secretaría y los suyos
  //   director   → reportes de las tareas que tiene asignadas y los suyos
  // Antes el director recibía todos los reportes del área guardada en su usuario,
  // que para casi todos es la secretaría completa.
  const reports = useMemo(
    () => filterVisibleReports(allReports, tasks, currentUser),
    [allReports, tasks, currentUser]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // La re-suscripción es automática; solo mostrar el indicador brevemente
    // Los datos llegan en tiempo real; el gesto envía lo que quedó pendiente sin conexión
    syncPendingOperations().catch(() => {}).finally(() => setRefreshing(false));
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
          { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder },
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
          <View style={[styles.modalContent, { backgroundColor: isDark ? 'rgba(15,10,25,0.97)' : 'rgba(255,255,255,0.98)', borderColor: theme.glassBorder, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Detalle del Reporte
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)} accessibilityRole="button" accessibilityLabel="Cerrar">
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

  const styles = useMemo(() => createStyles(theme), [theme]);

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
      {!embedded && (
        <ScreenHeader
          title="Reportes de mi área"
          subtitle={roleLabel(currentUser?.role)}
          onBack={() => navigation.goBack()}
        />
      )}

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
        <EmptyState
          icon="cloud-offline-outline"
          variant="warning"
          title="No se pudieron cargar los reportes"
          message="Revisa tu conexión e intenta de nuevo."
        />
      ) : filteredReports.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={filter === 'mine' ? 'Sin reportes propios' : filter === 'team' ? 'Sin reportes del equipo' : 'Sin reportes'}
          message={filter === 'mine'
            ? 'Aún no has enviado reportes. Crea uno desde una tarea asignada.'
            : filter === 'team'
              ? 'Tu equipo no ha enviado reportes aún.'
              : 'No hay reportes disponibles. Ajusta los filtros para ver más resultados.'}
        />
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
