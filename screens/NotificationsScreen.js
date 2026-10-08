// screens/NotificationsScreen.js
// Pantalla de notificaciones con historial y acciones

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Platform,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { confirmAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { toMs } from '../utils/dateUtils';
import { subscribeToMyNotifications, markNotificationsRead, deleteNotifications } from '../services/notificationsLive';
import { useTasks } from '../contexts/TasksContext';
import { hapticSuccess, hapticLight } from '../utils/haptics';
import ShimmerEffect from '../components/ShimmerEffect';
import { getSwipeable } from '../utils/platformComponents';
const Swipeable = getSwipeable();
import { useNotification } from '../contexts/NotificationContext';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import ScreenHeader from '../components/ui/ScreenHeader';
import { syncPendingOperations } from '../services/offlineSync';
import { styles, cardStyles } from './notifications/NotificationsScreenStyles';

// Filtros de la lista. `match` decide qué notificaciones entran en cada uno.
const FILTERS = [
  { id: 'all',      label: 'Todas',     match: () => true },
  { id: 'unread',   label: 'No leídas', match: (n) => !n.read },
  { id: 'tasks',    label: 'Tareas',    match: (n) => (n.type || '').includes('task') },
  { id: 'reports',  label: 'Reportes',  match: (n) => n.type === 'new_report' },
  { id: 'messages', label: 'Mensajes',  match: (n) => n.type === 'new_message' },
];

// Los títulos guardados empiezan con un emoji ("📋 Nuevo Reporte"); la tarjeta ya
// muestra su propio icono, así que se quita para no repetirlo.
const cleanTitle = (title) => asText(title || 'Notificación').replace(/^[^\p{L}\p{N}¡¿]+/u, '').trim() || 'Notificación';

// Una notificación guardada con un título o un cuerpo que no es texto (un objeto, un
// número) no debe tumbar la pantalla: se muestra como texto o se omite.
const asText = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// Encabezado de grupo según la antigüedad de la notificación
const getDayGroup = (timestamp) => {
  const ms = toMs(timestamp);
  if (!ms) return 'Anteriores';
  const today = startOfDay(new Date());
  if (ms >= today) return 'Hoy';
  if (ms >= today - 86400000) return 'Ayer';
  if (ms >= today - 6 * 86400000) return 'Esta semana';
  return 'Anteriores';
};

const NotificationCard = React.memo(({ item, onPress, onDelete, theme, isDark, getColor, getIcon }) => (
  <View
    style={[
      cardStyles.notificationCard,
      {
        backgroundColor: item.read ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)'),
        borderColor: item.read ? theme.border : getColor(item.type),
        borderLeftWidth: item.read ? 1 : 4,
      },
    ]}
  >
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={cleanTitle(item.title)}
      accessibilityHint={item.read ? 'Ver detalles' : 'Marcar como leída y ver detalles'}
      style={({ pressed }) => [cardStyles.notificationTouchable, pressed && { opacity: 0.7 }]}
    >
      <View style={[cardStyles.notificationIcon, { backgroundColor: getColor(item.type) + '20' }]}>
        <Ionicons name={getIcon(item.type)} size={20} color={getColor(item.type)} />
      </View>
      <View style={cardStyles.notificationContent}>
        <Text style={[cardStyles.notificationTitle, { color: theme.text, fontWeight: item.read ? '600' : '700' }]}>
          {cleanTitle(item.title)}
        </Text>
        <Text style={[cardStyles.notificationBody, { color: theme.textSecondary }]} numberOfLines={3}>
          {asText(item.body) || asText(item.message)}
        </Text>
        <Text style={[cardStyles.notificationTime, { color: theme.textTertiary }]}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={[cardStyles.unreadBadge, { backgroundColor: getColor(item.type) }]} />}
    </Pressable>
    {Platform.OS === 'web' && (
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Eliminar notificación"
        style={({ pressed }) => [cardStyles.deleteButton, pressed && { opacity: 0.5, transform: [{ scale: 0.95 }] }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={theme.error} />
      </Pressable>
    )}
  </View>
));

export default function NotificationsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const { showError, showSuccess, showInfo } = useNotification();
  const { currentUser, tasks } = useTasks();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('all');
  // Cambia para volver a suscribirse (botón Reintentar)
  const [reloadKey, setReloadKey] = useState(0);

  const userId = currentUser?.userId;

  // Lista en tiempo real: las notificaciones nuevas aparecen sin recargar la pantalla
  useEffect(() => {
    if (!userId) return undefined;
    setError(false);
    setLoading(true);
    return subscribeToMyNotifications(
      userId,
      (data) => {
        setNotifications(data);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        if (__DEV__) console.error('Error cargando notificaciones:', err);
        setError(true);
        setLoading(false);
        setRefreshing(false);
      }
    );
  }, [userId, reloadKey]);

  const retry = useCallback(() => setReloadKey(key => key + 1), []);

  const onRefresh = useCallback(() => {
    // La lista ya es en tiempo real; el gesto solo confirma visualmente
    setRefreshing(true);
    // Los datos llegan en tiempo real; el gesto envía lo que quedó pendiente sin conexión
    syncPendingOperations().catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const readCount = notifications.length - unreadCount;

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    hapticSuccess();
    try {
      await markNotificationsRead(unreadIds);
      showSuccess(`${unreadIds.length} ${unreadIds.length === 1 ? 'notificación marcada como leída' : 'notificaciones marcadas como leídas'}`);
    } catch (err) {
      if (__DEV__) console.error('Error marcando todas como leídas:', err);
      showError('No se pudieron marcar como leídas');
    }
  }, [notifications, showSuccess, showError]);

  const handleDeleteRead = useCallback(() => {
    const readIds = notifications.filter((n) => n.read).map((n) => n.id);
    if (readIds.length === 0) return;
    confirmAlert(
      'Eliminar leídas',
      `Se eliminarán ${readIds.length} ${readIds.length === 1 ? 'notificación ya leída' : 'notificaciones ya leídas'}. Las no leídas se conservan.`,
      async () => {
        try {
          await deleteNotifications(readIds);
          showSuccess('Notificaciones leídas eliminadas');
        } catch (err) {
          if (__DEV__) console.error('Error eliminando leídas:', err);
          showError('No se pudieron eliminar');
        }
      },
      'Eliminar'
    );
  }, [notifications, showSuccess, showError]);

  // Eliminar una sola: sin diálogo de confirmación, es una acción menor y frecuente
  const handleDeleteNotification = useCallback(async (notificationId) => {
    hapticLight();
    try {
      await deleteNotifications([notificationId]);
    } catch (err) {
      if (__DEV__) console.error('Error eliminando notificación:', err);
      showError('No se pudo eliminar la notificación');
    }
  }, [showError]);

  const handleNotificationPress = useCallback(async (notification) => {
    hapticLight();
    if (!notification.read) {
      markNotificationsRead([notification.id]).catch((err) => {
        if (__DEV__) console.error('Error marcando como leída:', err);
      });
    }

    const { type, taskId } = notification;
    // La tarea está en `tasks` solo si existe y el usuario puede verla
    const task = taskId ? tasks.find((t) => t.id === taskId) : null;

    if (type === 'new_report' && taskId) {
      // Los reportes se pueden consultar aunque la tarea ya no esté en la lista
      navigation.navigate('TaskReportsAndActivity', {
        taskId,
        taskTitle: task?.title || notification.taskTitle || 'Reporte',
      });
      return;
    }

    if ((type === 'new_message' || (type || '').includes('task')) && taskId) {
      if (!task) {
        showInfo('Esa tarea ya no está disponible');
        return;
      }
      if (type === 'new_message') {
        navigation.navigate('TaskChat', { taskId, taskTitle: task.title || 'Chat de tarea' });
      } else {
        navigation.navigate('TaskDetail', { task, taskId: task.id });
      }
      return;
    }

    if (notification.areaId && type === 'area_created') {
      navigation.navigate('AreaManagement');
    }
  }, [navigation, tasks, showInfo]);

  const filterCounts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, notifications.filter(f.match).length])),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
    return notifications.filter(active.match);
  }, [notifications, filter]);

  // Lista con encabezados por día ("Hoy", "Ayer", …)
  const listItems = useMemo(() => {
    const items = [];
    let lastGroup = null;
    filteredNotifications.forEach((notification) => {
      const group = getDayGroup(notification.createdAt);
      if (group !== lastGroup) {
        items.push({ id: `header-${group}`, _header: group });
        lastGroup = group;
      }
      items.push(notification);
    });
    return items;
  }, [filteredNotifications]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return 'checkbox-outline';
      case 'subtask_completed':
        return 'checkmark-circle';
      case 'task_due_soon':
        return 'time';
      case 'area_created':
        return 'folder';
      case 'area_chief_assigned':
        return 'person-circle';
      case 'new_report':
        return 'document-text';
      case 'new_message':
        return 'chatbubble-ellipses';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = useCallback((type) => {
    switch (type) {
      case 'subtask_completed':
        return theme.success;
      case 'task_due_soon':
        return theme.warning;
      case 'area_created':
        return theme.primary;
      case 'area_chief_assigned':
        return theme.secondary;
      case 'new_report':
      case 'new_message':
        return theme.info;
      default:
        return theme.primary;
    }
  }, [theme.primary, theme.success, theme.warning, theme.secondary, theme.info]);

  const renderNotifSwipeActions = useCallback((progress, dragX, item) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={{ transform: [{ translateX: trans }], justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => handleDeleteNotification(item.id)}
          style={{
            backgroundColor: theme.error,
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: '100%',
            borderRadius: 10,
          }}
          accessibilityLabel="Eliminar notificación"
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, [handleDeleteNotification, theme.error]);

  const renderNotification = useCallback(({ item }) => {
    if (item._header) {
      return <Text style={[styles.groupHeader, { color: theme.textSecondary }]}>{item._header}</Text>;
    }

    const card = (
      <NotificationCard
        item={item}
        onPress={() => handleNotificationPress(item)}
        onDelete={() => handleDeleteNotification(item.id)}
        theme={theme}
        isDark={isDark}
        getColor={getNotificationColor}
        getIcon={getNotificationIcon}
      />
    );

    if (Platform.OS === 'web') return card;

    return (
      <Swipeable
        renderRightActions={(progress, dragX) =>
          renderNotifSwipeActions(progress, dragX, item)
        }
        friction={2}
        overshootRight={false}
      >
        {card}
      </Swipeable>
    );
  }, [handleNotificationPress, handleDeleteNotification, getNotificationColor, theme, isDark, renderNotifSwipeActions]);

  const renderBody = () => {
    if (loading) {
      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ShimmerEffect width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerEffect width="70%" height={14} borderRadius={6} />
                <ShimmerEffect width="45%" height={12} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: theme.errorAlpha }]}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.error} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Error de conexión</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>No se pudieron cargar las notificaciones.</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={retry}
            accessibilityLabel="Reintentar"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredNotifications.length === 0) {
      const emptyText = {
        all: 'Las notificaciones aparecerán aquí cuando tengas actividad.',
        unread: 'Estás al día, todo leído.',
        tasks: 'No hay notificaciones de tareas.',
        reports: 'No hay notificaciones de reportes.',
        messages: 'No hay notificaciones de mensajes.',
      }[filter];
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder }]}>
            <Ionicons name="notifications-off-outline" size={48} color={theme.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {filter === 'all' ? 'Sin notificaciones' : 'Sin notificaciones aquí'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{emptyText}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={listItems}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        windowSize={5}
        maxToRenderPerBatch={8}
        initialNumToRender={10}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      {/* Header */}
      <ScreenHeader
        title="Notificaciones"
        subtitle={`${notifications.length} ${notifications.length === 1 ? 'notificación' : 'notificaciones'}${unreadCount > 0 ? ` · ${unreadCount} sin leer` : ''}`}
        onBack={() => navigation.goBack()}
        actions={[
          unreadCount > 0 && { icon: 'checkmark-done', label: 'Marcar todas como leídas', onPress: handleMarkAllAsRead },
          readCount > 0 && { icon: 'trash-outline', label: 'Eliminar las notificaciones leídas', onPress: handleDeleteRead },
        ].filter(Boolean)}
      />

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = filterCounts[f.id] || 0;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${f.label}, ${count}`}
              style={[
                styles.filterButton,
                active
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: theme.glass, borderColor: theme.glassBorder },
                Platform.OS === 'web' && { cursor: 'pointer' },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.filterLabel, { color: active ? '#FFFFFF' : theme.text }]}>{f.label}</Text>
                {f.id !== 'all' && count > 0 && (
                  <View style={[styles.unreadBadgeFilter, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : (f.id === 'unread' ? theme.primary : theme.textSecondary) }]}>
                    <Text style={styles.unreadBadgeFilterText}>{count > 99 ? '99+' : count}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {renderBody()}

      </View>
    </View>
  );
}

const formatTime = (timestamp) => {
  const ms = toMs(timestamp);
  if (!ms) return '';

  const date = new Date(ms);
  const diff = Date.now() - ms;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Justo ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;

  // Fecha en formato local (día/mes/año), no el del navegador
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};
