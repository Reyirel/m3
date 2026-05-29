import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSwipeable } from '../utils/platformComponents';
const Swipeable = getSwipeable();
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToTaskReports, subscribeToTaskActivity, rateTaskReport, deleteTaskReport } from '../services/reportsService';
import ReportFormModal from '../components/ReportFormModal';
import { useTasks } from '../contexts/TasksContext';
import ExportReportModal from '../components/ExportReportModal';
import { useNotification } from '../contexts/NotificationContext';
import ShimmerEffect from '../components/ShimmerEffect';

const { width } = Dimensions.get('window');

const TaskReportsAndActivityScreen = ({ route, navigation }) => {
  const { taskId, taskTitle } = route.params;
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { currentUser } = useTasks();
  const [reports, setReports] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState('reports'); // 'reports' or 'activity'
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [hoverRating, setHoverRating] = useState({});  // Para feedback visual de estrellas
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'web' ? 16 : 48,
      paddingBottom: 22,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
      overflow: 'hidden',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 2,
      letterSpacing: -0.3,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: theme.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeTabText: {
      color: theme.primary,
    },
    content: {
      flex: 1,
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
      paddingHorizontal: 32,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#333',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    addButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.primary,
      borderRadius: 6,
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    // Report styles
    reportCard: {
      backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
      borderWidth: 1,
      borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
      marginHorizontal: 12,
      marginVertical: 8,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      overflow: 'hidden',
    },
    reportHeader: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reportTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    reportMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    reportDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: isDark ? theme.glass : theme.glassStrong,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    ratingText: {
      fontSize: 12,
      color: isDark ? '#fff' : '#333',
      fontWeight: '600',
    },
    reportContent: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? theme.glass : theme.glassStrong,
    },
    reportDescription: {
      fontSize: 13,
      color: theme.text,
      lineHeight: 20,
      marginBottom: 12,
    },
    imagesContainer: {
      marginBottom: 12,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    reportImage: {
      width: (width - 48) / 2,
      height: (width - 48) / 2,
      borderRadius: 8,
      backgroundColor: isDark ? theme.glass : theme.glassStrong,
    },
    ratingSection: {
      borderTopWidth: 1,
      borderTopColor: isDark ? theme.glass : theme.glassStrong,
      paddingTop: 10,
      marginTop: 10,
    },
    ratingLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      paddingVertical: 8,
    },
    starButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? theme.glass : theme.glassStrong,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.border,
    },
    starActive: {
      backgroundColor: theme.warning,
    },
    // Activity styles
    activityItem: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
      backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
    },
    activityIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
    },
    activityAction: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    activityTime: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    activityDetails: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
      fontStyle: 'italic',
    },
  }), [isDark, theme]);

  const unsubReportsRef = useRef(null);
  const unsubActivityRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        if (!mounted) return;
        unsubReportsRef.current = subscribeToTaskReports(taskId, setReports);
        unsubActivityRef.current = subscribeToTaskActivity(taskId, setActivities);
        if (mounted) setLoading(false);
      } catch (error) {
        if (__DEV__) console.error('Error loading data:', error);
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
      unsubReportsRef.current?.();
      unsubActivityRef.current?.();
    };
  }, [taskId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    unsubReportsRef.current?.();
    unsubActivityRef.current?.();
    unsubReportsRef.current = subscribeToTaskReports(taskId, setReports);
    unsubActivityRef.current = subscribeToTaskActivity(taskId, setActivities);
    setTimeout(() => setRefreshing(false), 800);
  }, [taskId]);

  const handleDeleteReport = useCallback((reportId) => {
    const doDelete = async () => {
      try {
        await deleteTaskReport(taskId, reportId);
        showSuccess('Reporte eliminado');
      } catch (error) {
        showError('Error al eliminar: ' + error.message);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar este reporte?')) doDelete();
    } else {
      Alert.alert('Eliminar reporte', '¿Estás seguro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  }, [taskId, showSuccess, showError]);

  const renderReportSwipeActions = useCallback((progress, dragX, reportId) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={{ transform: [{ translateX: trans }], justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => handleDeleteReport(reportId)}
          style={{
            backgroundColor: theme.error,
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: '100%',
            borderRadius: 12,
          }}
          accessibilityLabel="Eliminar reporte"
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, [handleDeleteReport]);

  const handleRateReport = async (reportId, rating) => {
    // En web Alert.alert no funciona bien, calificamos directamente
    try {
      await rateTaskReport(taskId, reportId, rating, '', currentUser.userId);
      showSuccess(`¡Reporte calificado con ${rating} estrellas!`);
      setExpandedReportId(null);
      setHoverRating({});
    } catch (error) {
      if (__DEV__) console.error('Error al calificar:', error);
      showError('Error al calificar: ' + error.message);
    }
  };

  const getActivityIcon = (action) => {
    const iconMap = {
      created: 'add-circle',
      updated: 'create',
      completed: 'checkmark-circle',
      report_created: 'document',
      report_rated: 'star',
      comment_added: 'chatbubble',
      status_changed: 'refresh-circle',
    };
    return iconMap[action] || 'information-circle';
  };

  const getActivityLabel = (action) => {
    const labelMap = {
      created: 'Task Created',
      updated: 'Task Updated',
      completed: 'Task Completed',
      report_created: 'Report Submitted',
      report_rated: 'Report Rated',
      comment_added: 'Comment Added',
      status_changed: 'Status Changed',
    };
    return labelMap[action] || action;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000 || timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  };

  const renderReportCard = ({ item }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() =>
        setExpandedReportId(expandedReportId === item.id ? null : item.id)
      }
    >
      <View style={styles.reportHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>{item.title}</Text>
          <View style={styles.reportMeta}>
            <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
            <Text style={styles.reportDate}>{formatDate(item.createdAt)}</Text>
            {item.rating > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={theme.warning} />
                <Text style={styles.ratingText}>{item.rating}/5</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons
          name={expandedReportId === item.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.primary}
        />
      </View>

      {expandedReportId === item.id && (
        <View style={styles.reportContent}>
          <Text style={styles.reportDescription}>{item.description}</Text>

          {item.images && item.images.length > 0 && (
            <View style={styles.imagesContainer}>
              <Text style={[styles.ratingLabel, { marginBottom: 8 }]}>
                Fotos de Evidencia ({item.images.length})
              </Text>
              <View style={styles.imageGrid}>
                {item.images.map((image, idx) => {
                  const imageUri = image.url || image.uri || image.dataUrl;
                  if (!imageUri) return null;
                  return (
                    <Image
                      key={idx}
                      source={{ uri: imageUri }}
                      style={styles.reportImage}
                      onError={() => {}}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {!item.rating && currentUser?.role === 'admin' && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Calificar este reporte</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isHovered = (hoverRating[item.id] || 0) >= star;
                  return (
                    <TouchableOpacity
                      key={star}
                      style={styles.starButton}
                      onPress={() => handleRateReport(item.id, star)}
                      onPressIn={() => setHoverRating({ ...hoverRating, [item.id]: star })}
                      onPressOut={() => setHoverRating({ ...hoverRating, [item.id]: 0 })}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isHovered ? 'star' : 'star-outline'}
                        size={28}
                        color={isHovered ? theme.warning : theme.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderActivityItem = ({ item }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: theme.primary }]}>
        <Ionicons
          name={getActivityIcon(item.action)}
          size={20}
          color="#fff"
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityAction}>
          {getActivityLabel(item.action)}
        </Text>
        <Text style={styles.activityTime}>
          {formatDate(item.timestamp)}
        </Text>
        {item.details && Object.keys(item.details).length > 0 && (
          <Text style={styles.activityDetails}>
            {JSON.stringify(item.details).substring(0, 60)}...
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header shimmer */}
        <LinearGradient colors={theme.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: 12, paddingBottom: 12 }]}>
          <ShimmerEffect width={32} height={32} borderRadius={8} />
          <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
            <ShimmerEffect width="60%" height={16} borderRadius={6} />
            <ShimmerEffect width="40%" height={12} borderRadius={5} />
          </View>
        </LinearGradient>
        {/* Tab bar shimmer */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
          <ShimmerEffect width={100} height={36} borderRadius={18} />
          <ShimmerEffect width={100} height={36} borderRadius={18} />
        </View>
        {/* Report card skeletons */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} scrollEnabled={false}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ShimmerEffect width={40} height={40} borderRadius={20} />
                <View style={{ flex: 1, gap: 6 }}>
                  <ShimmerEffect width="55%" height={13} borderRadius={5} />
                  <ShimmerEffect width="35%" height={11} borderRadius={5} />
                </View>
              </View>
              <ShimmerEffect width="100%" height={70} borderRadius={10} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // El admin no puede agregar reportes, solo verlos y calificarlos
  const isAdmin = currentUser?.role === 'admin';

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        {/* Botón de regresar */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{taskTitle}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            Reportes e Historial
          </Text>
        </View>
        {reports.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSelectedReport(reports[0]);
              setShowExportModal(true);
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.25)',
            }}
          >
            <Ionicons name="download" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'reports' && styles.activeTab]}
          onPress={() => setTab('reports')}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'reports' && styles.activeTabText,
            ]}
          >
            Reportes ({reports.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'activity' && styles.activeTab]}
          onPress={() => setTab('activity')}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'activity' && styles.activeTabText,
            ]}
          >
            Actividad ({activities.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {tab === 'reports' ? (
          reports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-outline"
                size={48}
                color={isDark ? '#333' : '#ddd'}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>Sin Reportes Aún</Text>
              <Text style={styles.emptySubtext}>
                {isAdmin 
                  ? 'Los usuarios asignados a esta tarea pueden enviar reportes'
                  : 'Envía un reporte con fotos y detalles sobre el avance'}
              </Text>
              {!isAdmin && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowReportForm(true)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addButtonText}>Agregar Reporte</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={reports}
              renderItem={({ item }) => {
                const card = renderReportCard({ item });
                if (Platform.OS === 'web' || !isAdmin) return card;
                return (
                  <Swipeable
                    renderRightActions={(progress, dragX) =>
                      renderReportSwipeActions(progress, dragX, item.id)
                    }
                    friction={2}
                    overshootRight={false}
                  >
                    {card}
                  </Swipeable>
                );
              }}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 8 }}
              windowSize={5}
              maxToRenderPerBatch={4}
              initialNumToRender={6}
              removeClippedSubviews={true}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              }
              ListFooterComponent={
                !isAdmin ? (
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      {
                        marginHorizontal: 12,
                        marginVertical: 12,
                        justifyContent: 'center',
                      },
                    ]}
                    onPress={() => setShowReportForm(true)}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>Agregar Otro Reporte</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          )
        ) : (
          <FlatList
            data={activities}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              activities.length === 0 ? { flex: 1 } : undefined
            }
            windowSize={5}
            maxToRenderPerBatch={6}
            initialNumToRender={8}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="time-outline"
                  size={48}
                  color={isDark ? '#333' : '#ddd'}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyText}>Sin Actividad Aún</Text>
                <Text style={styles.emptySubtext}>
                  El historial de actividad aparecerá aquí
                </Text>
              </View>
            }
          />
        )}
      </View>

      <ReportFormModal
        visible={showReportForm}
        onClose={() => setShowReportForm(false)}
        taskId={taskId}
        onSuccess={() => {
          showSuccess('¡Reporte enviado exitosamente!');
        }}
      />

      <ExportReportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        report={selectedReport}
        task={{ titulo: taskTitle }}
        allReports={reports}
      />

    </View>
  );
};

export default TaskReportsAndActivityScreen;
