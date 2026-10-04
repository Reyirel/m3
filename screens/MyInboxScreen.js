// screens/MyInboxScreen.js
// "Mi bandeja" - lista de tareas asignadas al usuario actual, ordenadas por fecha de vencimiento.
// Acciones rápidas: marcar cerrada y posponer 1 día. Abre detalle y chat.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  Easing,
  Platform,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import TaskItem from '../components/TaskItem';
import EmptyState from '../components/EmptyState';
import ShimmerEffect from '../components/ShimmerEffect';
import { updateTask, deleteTask as deleteTaskFirebase } from '../services/tasks';
import { cancelNotification } from '../services/notifications';
import { hapticMedium, hapticLight } from '../utils/haptics';
import { useNotification } from '../contexts/NotificationContext';
import { isTaskAssignedToUser } from '../utils/taskHelpers';
import { canChangeTaskStatus } from '../services/permissions';
import { deleteManager } from '../utils/deleteManager';
import { confirmTaskCompletion } from '../services/taskConfirmations';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { scheduleOverdueTasksNotification, scheduleMultipleDailyOverdueNotifications } from '../services/notifications';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';
import { isOverdue, toMs } from '../utils/dateUtils';
import { statusLabel, normalizeStatus } from '../utils/taskStatus';
import { getDireccionesBySecretaria } from '../config/areas';
import { createStyles } from './inbox/MyInboxScreenStyles';


export default function MyInboxScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks, setTasks, isLoading: tasksLoading, currentUser } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [recentMessages, setRecentMessages] = useState([]);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [taskToClose, setTaskToClose] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    area: [],
    overdue: false,
  });
  const [deletingTaskIds, setDeletingTaskIds] = useState(new Set());
  const [compactView, setCompactView] = useState(false); // Vista compacta

  // Animation refs for stagger effect
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const userCardOpacity = useRef(new Animated.Value(0)).current;
  const userCardSlide = useRef(new Animated.Value(20)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchSlide = useRef(new Animated.Value(20)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listSlide = useRef(new Animated.Value(30)).current;
  const isMountedRef = useRef(true);
  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);

  // Stagger animations on mount
  useEffect(() => {
    const startAnimations = () => {
      Animated.stagger(80, [
        Animated.parallel([
          Animated.timing(headerOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
          Animated.spring(headerSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(userCardOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
          Animated.spring(userCardSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(searchOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
          Animated.spring(searchSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(listOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
          Animated.spring(listSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        ]),
      ]).start();
    };

    if (Platform.OS !== 'web') {
      const interaction = InteractionManager.runAfterInteractions(startAnimations);
      return () => interaction.cancel();
    } else {
      startAnimations();
    }
  }, [headerOpacity, headerSlide, listOpacity, listSlide, searchOpacity, searchSlide, userCardOpacity, userCardSlide]);

  useEffect(() => {
    // 💾 al montar: restaurar tareas en proceso de borrado
    restoreDeletingTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => {
      if (isMountedRef.current) setRefreshing(false);
    }, 1000);
  }, []);

  // Cargar mensajes recientes de tareas donde el usuario está involucrado
  useEffect(() => {
    if (!currentUser?.email || !db) return;

    const MESSAGES_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
    const cacheKey = `@inbox_messages_${currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const loadRecentMessages = async () => {
      try {
        // Verificar cache antes de ir a Firestore
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < MESSAGES_CACHE_TTL) {
            setRecentMessages(data);
            return;
          }
        }

        const messages = [];
        const userEmail = currentUser.email?.toLowerCase().trim() || '';

        // Obtener tareas donde el usuario está involucrado
        let userTasks = tasks.filter(task => {
          if (!task || !task.id) return false;
          return isTaskAssignedToUser(task, userEmail) ||
            task.createdBy?.toLowerCase().trim() === userEmail;
        });

        // Si es admin, agregar tareas con actividad reciente
        if (currentUser.role === 'admin' && userTasks.length < 10) {
          const otherTasks = tasks
            .filter(task => {
              if (!task || !task.id) return false;
              return !isTaskAssignedToUser(task, userEmail) &&
                task.createdBy?.toLowerCase().trim() !== userEmail;
            })
            .slice(0, 10 - userTasks.length);
          userTasks = [...userTasks, ...otherTasks];
        }

        // Por cada tarea, obtener los últimos 3 mensajes
        for (const task of userTasks.slice(0, 10)) {
          try {
            if (!task.id) continue;

            const messagesRef = collection(db, 'tasks', task.id, 'messages');
            const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(3));
            const snapshot = await getDocs(q);
            
            snapshot.forEach(doc => {
              const msgData = doc.data();
              // Solo incluir mensajes de otros usuarios con datos válidos
              if (msgData && 
                  typeof msgData.text === 'string' && 
                  msgData.text.trim() !== '' &&
                  msgData.author && 
                  msgData.author !== currentUser.displayName && 
                  msgData.author !== currentUser.email) {
                messages.push({
                  id: `${doc.id}-${Date.now()}`,
                  taskId: task.id,
                  taskTitle: task.title || 'Sin título',
                  author: msgData.author || 'Anónimo',
                  text: msgData.text || '',
                  createdAt: msgData.createdAt || null
                });
              }
            });
          } catch (err) {
            // Silenciar errores de tareas individuales
          }
        }

        // Ordenar por fecha y tomar los 5 más recientes
        messages.sort((a, b) => {
          try {
            const timeA = toMs(a.createdAt) || 0;
            const timeB = toMs(b.createdAt) || 0;
            return timeB - timeA;
          } catch {
            return 0;
          }
        });

        const result = messages.slice(0, 5);
        setRecentMessages(result);
        // Guardar en cache
        AsyncStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() })).catch(() => {});
      } catch (error) {
        setRecentMessages([]);
      }
    };

    if (tasks.length > 0) {
      loadRecentMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, tasks.length]);

  // Filtrar y ordenar tareas con búsqueda y filtros avanzados
  const filtered = tasks
    .filter(task => {
      // Si no hay usuario, no mostrar nada
      if (!currentUser) return false;
      
      // Filtraje basado en rol
      const userRole = currentUser.role;
      const userEmail = currentUser.email?.toLowerCase();
      const userArea = currentUser.area || currentUser.department || '';
      
      // Admin ve todo
      if (userRole === 'admin') {
        // No filtrar por asignación
      }
      // Secretario ve tareas de su área Y de todas sus direcciones
      else if (userRole === 'secretario') {
        const misDirecciones = getDireccionesBySecretaria(userArea);
        const taskAreaLower = (task.area || '').toLowerCase().trim();
        const userAreaLower = (userArea || '').toLowerCase().trim();
        const isInMySecretaria = taskAreaLower === userAreaLower;
        const isInMyDirecciones = misDirecciones.some(d => d?.toLowerCase().trim() === taskAreaLower);
        const isAssignedToMe = isTaskAssignedToUser(task, userEmail);
        const isCreatedByMe = task.createdBy?.toLowerCase() === userEmail;
        // El secretario ve: tareas de su secretaría, tareas de sus direcciones, tareas asignadas a él, o tareas que creó
        if (!isInMySecretaria && !isInMyDirecciones && !isAssignedToMe && !isCreatedByMe) return false;
      }
      // Director ve tareas de su área o asignadas a él
      else if (userRole === 'director') {
        const taskAreaLower = (task.area || '').toLowerCase().trim();
        const userAreaLower = (userArea || '').toLowerCase().trim();
        const isInMyArea = taskAreaLower === userAreaLower;
        const isAssignedToMe = isTaskAssignedToUser(task, userEmail);
        const isCreatedByMe = task.createdBy?.toLowerCase() === userEmail;
        if (!isInMyArea && !isAssignedToMe && !isCreatedByMe) return false;
      }
      
      // Filtro de búsqueda (título, descripción)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(search);
        const matchDesc = task.description?.toLowerCase().includes(search);
        if (!matchTitle && !matchDesc) return false;
      }
      
      // Filtro de estado (normalizar variantes de en_proceso)
      if (filters.status.length > 0) {
        if (!filters.status.includes(normalizeStatus(task.status))) return false;
      }
      
      // Filtro de prioridad
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;
      
      // Filtro de dirección/área
      if (filters.area.length > 0 && !filters.area.includes(task.area)) return false;
      
      // Filtro de vencidas
      if (filters.overdue && !isOverdue(task)) return false;
      
      return true;
    })
    .sort((a, b) => (toMs(a.dueAt) || 0) - (toMs(b.dueAt) || 0));

  // Contar tareas vencidas
  const overdueTasks = filtered.filter(task => isOverdue(task));
  const overdueCount = overdueTasks.length;

  // Ref para evitar programar notificaciones múltiples veces
  const lastScheduledRef = useRef(null);

  // Ref para evitar eliminar la misma tarea múltiples veces
  const deletingTasksRef = useRef(new Set());

  // Programar notificación diaria de tareas vencidas (solo una vez al día)
  useEffect(() => {
    if (overdueCount > 0) {
      const today = new Date().toDateString();
      
      // Solo programar si no se ha hecho hoy
      if (lastScheduledRef.current !== today) {
        // Notificación diaria a las 9 AM
        scheduleOverdueTasksNotification(overdueTasks);
        // Notificaciones múltiples (9 AM, 2 PM, 6 PM)
        scheduleMultipleDailyOverdueNotifications(overdueTasks);
        
        lastScheduledRef.current = today;
      }
    }
  }, [overdueCount, overdueTasks]); // Solo cuando cambia de 0 a >0 o viceversa

  // Mostrar modal de confirmación para cerrar tarea
  const askToClose = (task) => {
    hapticMedium();
    setTaskToClose(task);
    setShowCloseConfirm(true);
  };

  // Confirmar cierre de tarea
  const confirmClose = async () => {
    if (!taskToClose) return;
    try {
      hapticMedium();
      // Cancelar notificación existente
      if (taskToClose.notificationId) await cancelNotification(taskToClose.notificationId);
      await updateTask(taskToClose.id, { status: 'cerrada' });
      showSuccess('Tarea completada exitosamente');
    } catch (e) {
      showError('Error al marcar como cerrada: ' + e.message);
    } finally {
      setShowCloseConfirm(false);
      setTaskToClose(null);
    }
  };

  const markClosed = async (task) => {
    askToClose(task);
  };

  // ✅ Confirmar mi parte de una tarea con múltiples asignados
  const confirmMyPart = async (task) => {
    try {
      hapticMedium();
      const result = await confirmTaskCompletion(task.id, {
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email,
        area: currentUser.department || ''
      });
      
      showSuccess(result.allCompleted ? 'Todos han confirmado - ¡Listo para revisión!' : `${result.completedCount}/${result.totalAssigned} han confirmado`);
    } catch (e) {
      showError(e.message);
    }
  };

  // 💾 Guardar tareas en proceso de borrado en AsyncStorage
  const saveDeletingTasks = async (taskIds) => {
    try {
      const tasksToDelete = Array.from(taskIds);
      await AsyncStorage.setItem('deletingTasks', JSON.stringify(tasksToDelete));
    } catch (error) {
      // Silent fail - AsyncStorage is optional
    }
  };

  // 🔄 Restaurar tareas en proceso de borrado al recargar
  const restoreDeletingTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem('deletingTasks');
      if (stored) {
        const taskIds = JSON.parse(stored);
        
        // Marcar como en proceso nuevamente
        const taskIdSet = new Set(taskIds);
        setDeletingTaskIds(taskIdSet);
        deletingTasksRef.current = taskIdSet;

        // ✅ INMEDIATAMENTE: Remover estas tareas de la lista UI para que no reaparezcan
        setTasks(prevTasks => prevTasks.filter(t => !taskIdSet.has(t.id)));

        // Continuar el proceso de borrado para cada tarea en background
        for (const taskId of taskIds) {
          // Intentar borrar de Firebase nuevamente
          deleteTaskFirebase(taskId)
            .then(() => {
              // Éxito
            })
            .catch(_error => {
              // Firebase delete failed - task remains marked as deleted locally
            })
            .finally(() => {
              // Limpiar del tracking
              deletingTasksRef.current.delete(taskId);
              setDeletingTaskIds(prev => {
                const updated = new Set(prev);
                updated.delete(taskId);
                return updated;
              });
            });
        }

        // Limpiar AsyncStorage después de restaurar
        await AsyncStorage.removeItem('deletingTasks');
      }
    } catch (error) {
      // AsyncStorage restore failed - continue with fresh state
    }
  };

  const deleteTask = async (taskId) => {
    // 🛡️ GUARD: Prevenir eliminación múltiple del mismo task
    if (deletingTasksRef.current.has(taskId)) {
      return;
    }
    
    // Verificar permisos ANTES de intentar
    if (!currentUser || currentUser.role !== 'admin') {
      showError(`Solo admins pueden eliminar. Tu rol: ${currentUser?.role || 'desconocido'}`);
      return;
    }

    // ✅ MARCAR COMO EN PROCESO (en state, ref Y context global)
    deletingTasksRef.current.add(taskId);
    setDeletingTaskIds(prev => new Set([...prev, taskId]));
    deleteManager.markDeleting(taskId);  // 🛡️ Evitar que el listener restaure la tarea
    
    // 💾 GUARDAR EN ASYNCSTORAGE para persistir si recarga
    await saveDeletingTasks(deletingTasksRef.current);
    
    // ✅ MOSTRAR TOAST INMEDIATAMENTE
    showInfo('Eliminando tarea, espera un momento...');

    // Esperar 600ms para que el usuario vea el INDICADOR ROJO
    // Luego remover de la lista UI
    setTimeout(() => {
      if (isMountedRef.current) setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    }, 600);
    
    // 🔄 FASE 2: EJECUTAR DELETE EN FIREBASE EN BACKGROUND (fire-and-forget)
    deleteTaskFirebase(taskId)
      .then(() => {
        showSuccess('✅ ¡TAREA ELIMINADA! Ya no aparecerá');
        // ✅ Solo desmarcar después de éxito confirmado
        deleteManager.confirmDelete(taskId);
      })
      .catch(_error => {
        showError('Error: No se pudo eliminar la tarea');
        // Mantener marcado para evitar que reaparezca
      })
      .finally(() => {
        // ✅ LIMPIAR MARCA LOCAL DE EN PROCESO
        deletingTasksRef.current.delete(taskId);
        setDeletingTaskIds(prev => {
          const updated = new Set(prev);
          updated.delete(taskId);
          return updated;
        });
      });
  };

  // Función para borrar múltiples tareas seleccionadas
  const deleteSelectedTasks = async () => {
    if (selectedTaskIds.size === 0) {
      showWarning('⚠️ Selecciona al menos una tarea');
      return;
    }

    if (!currentUser || currentUser.role !== 'admin') {
      showError('❌ Solo admins pueden eliminar tareas');
      return;
    }

    const count = selectedTaskIds.size;
    showInfo(`🔴 ¡ELIMINANDO ${count} TAREA${count > 1 ? 'S' : ''}! Espera...`);

    // Marcar todas como eliminando (local + context global)
    const newDeletingSet = new Set([...deletingTasksRef.current, ...selectedTaskIds]);
    deletingTasksRef.current = newDeletingSet;
    setDeletingTaskIds(newDeletingSet);
    
    // 🛡️ Marcar en context global para evitar restauración por listener
    selectedTaskIds.forEach(taskId => deleteManager.markDeleting(taskId));

    // 💾 GUARDAR EN ASYNCSTORAGE para persistir si recarga
    await saveDeletingTasks(newDeletingSet);

    // Esperar 800ms para que el usuario vea el INDICADOR ROJO con "ELIMINANDO"
    // Luego remover de la lista UI
    setTimeout(() => {
      if (isMountedRef.current) setTasks(prevTasks => prevTasks.filter(t => !selectedTaskIds.has(t.id)));
    }, 800);

    // Eliminar todas en background
    const taskIdsToDelete = Array.from(selectedTaskIds);
    const deletePromises = taskIdsToDelete.map(taskId => 
      deleteTaskFirebase(taskId)
        .then(() => {
          deleteManager.confirmDelete(taskId); // Desmarcar solo las que se eliminaron correctamente
          return taskId;
        })
        .catch(_err => {
          // Firebase delete failed
          return null; // Mantener marcado para evitar que reaparezca
        })
    );

    Promise.all(deletePromises)
      .then((results) => {
        const successCount = results.filter(r => r !== null).length;
        showSuccess(`✅ ¡${successCount} TAREA${successCount > 1 ? 'S' : ''} ELIMINADA${successCount > 1 ? 'S' : ''}! Ya no aparecerán`);
        setSelectedTaskIds(new Set());
      })
      .catch(_err => {
        showError('❌ Error: No se pudieron eliminar todas las tareas');
      })
      .finally(() => {
        setDeletingTaskIds(prev => {
          const updated = new Set(prev);
          taskIdsToDelete.forEach(id => updated.delete(id));
          return updated;
        });
      });
  };

  // Toggle selección de tarea
  const toggleTaskSelection = (taskId) => {
    const updated = new Set(selectedTaskIds);
    if (updated.has(taskId)) {
      updated.delete(taskId);
    } else {
      updated.add(taskId);
    }
    setSelectedTaskIds(updated);
    hapticMedium();
  };

  // Obtener áreas únicas disponibles para filtros
  const uniqueAreas = [...new Set(tasks.map(t => t.area).filter(Boolean))].sort();

  // quickStats and taskSections removed (computed but not rendered)
  const _quickStats = React.useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const in48Hours = now + (48 * 60 * 60 * 1000);

    const activeTasks = filtered.filter(t => t.status !== 'cerrada');
    const overdue = activeTasks.filter(t => t.dueAt && toMs(t.dueAt) < now);
    const dueToday = activeTasks.filter(t => {
      if (!t.dueAt) return false;
      const due = toMs(t.dueAt);
      return due >= todayStart.getTime() && due <= todayEnd.getTime();
    });
    const upcoming = activeTasks.filter(t => {
      if (!t.dueAt) return false;
      const due = toMs(t.dueAt);
      return due > todayEnd.getTime() && due <= in48Hours;
    });
    const completed = filtered.filter(t => t.status === 'cerrada');

    return {
      total: filtered.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
      completed: completed.length,
      pending: activeTasks.length,
    };
  }, [filtered]);

  const _taskSections = React.useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const sections = {
      overdue: [],
      today: [],
      upcoming: [],
      noDate: [],
      completed: [],
    };

    filtered.forEach(task => {
      if (task.status === 'cerrada') {
        sections.completed.push(task);
      } else if (task.dueAt) {
        const due = toMs(task.dueAt);
        if (due < now) {
          sections.overdue.push(task);
        } else if (due >= todayStart.getTime() && due <= todayEnd.getTime()) {
          sections.today.push(task);
        } else {
          sections.upcoming.push(task);
        }
      } else {
        sections.noDate.push(task);
      }
    });

    return sections;
  }, [filtered]);

  const toggleComplete = async (task) => {
    // Validar permisos: solo admin puede reabrir
    if (task.status === 'cerrada' && currentUser?.role !== 'admin') {
      showWarning('Solo administradores pueden reabrir tareas');
      return;
    }
    
    const newStatus = task.status === 'cerrada' ? 'pendiente' : 'cerrada';
    await changeStatus(task.id, newStatus);
  };

  const changeStatus = async (taskId, newStatus) => {
    // Misma regla que en Inicio y Kanban: cada rol solo puede hacer sus transiciones
    const task = tasks.find(t => t.id === taskId);
    const perm = canChangeTaskStatus(currentUser, task || { id: taskId }, newStatus);
    if (!perm.canChange) {
      showWarning(perm.reason || 'No tienes permisos para cambiar el estado');
      return;
    }
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (e) {
      showError(e?.code === 'permission-denied' ? e.message : 'No se pudo actualizar la tarea');
    }
  };

  const openDetail = (task) => {
    // Admin, secretario, y director pueden editar tareas
    const canEdit = currentUser && ['admin', 'secretario', 'director'].includes(currentUser.role);
    if (!canEdit) {
      showInfo('No tienes permisos para editar tareas');
      return;
    }
    navigation.navigate('TaskDetail', { task, taskId: task.id });
  };
  
  const openChat = (task) => navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
  
  const goToCreate = () => {
    // Solo admin puede crear tareas principales
    const canCreate = currentUser && ['admin'].includes(currentUser.role);
    if (!canCreate) {
      showWarning('Solo administradores pueden crear tareas. Los secretarios y directores solo pueden crear subtareas.');
      return;
    }
    navigation.navigate('TaskDetail');
  };

  const renderItem = ({ item }) => {
    const isAdmin = currentUser?.role === 'admin';
    const isSelected = selectedTaskIds.has(item.id);
    const isDeleting = deletingTaskIds.has(item.id);

    return (
      <View style={[
        styles.itemWrapper,
        isSelected && { backgroundColor: theme.infoAlpha, borderColor: theme.info + '40', borderWidth: 1 },
      ]}>
        {/* Checkbox de selección múltiple (admin) — circular, al inicio */}
        {isAdmin && (
          <TouchableOpacity
            onPress={() => toggleTaskSelection(item.id)}
            style={[
              styles.selectionCircle,
              isSelected
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)' }
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <TaskItem
            task={item}
            compact={compactView}
            onPress={() => !isDeleting && openDetail(item)}
            onDelete={isAdmin ? () => deleteTask(item.id) : undefined}
            onToggleComplete={() => !isDeleting && toggleComplete(item)}
            onReopen={isAdmin ? () => !isDeleting && changeStatus(item.id, 'pendiente') : undefined}
            onChangeStatus={item.status !== 'cerrada'
              ? (task, newStatus) => !isDeleting && changeStatus(task.id, newStatus)
              : undefined}
            onChat={(task) => openChat(task)}
            currentUserRole={currentUser?.role || 'director'}
            isDeleting={isDeleting}
          />
        </View>
      </View>
    );
  };

  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, width, padding), [theme, isDark, isDesktop, isTablet, width, padding]);

  // Mostrar shimmer mientras se cargan las tareas
  if (tasksLoading && !currentUser) {
    return (
      <View style={styles.container}>
        <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
          <LinearGradient
            colors={theme.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconWrapper}>
                  <Ionicons name="file-tray-full" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.greeting}>Mi Bandeja</Text>
                  <Text style={styles.heading}>Cargando...</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
          <View style={{ flex: 1, padding: 16 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={{ backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)', padding: 16, borderRadius: 14, marginBottom: 12 }}>
                <ShimmerEffect width="70%" height={18} style={{ marginBottom: 8 }} />
                <ShimmerEffect width="100%" height={14} style={{ marginBottom: 6 }} />
                <ShimmerEffect width="40%" height={12} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      
      {/* Header Premium Compacto */}
      <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrapper}>
                <Ionicons name="file-tray-full" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.greeting}>Mi Bandeja</Text>
                <Text style={styles.heading}>
                  {filtered.length} {filtered.length === 1 ? 'tarea' : 'tareas'}
                </Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              {/* Badge vencidas */}
              {filtered.filter(t => isOverdue(t)).length > 0 && (
                <TouchableOpacity 
                  style={styles.overdueBadge}
                  onPress={() => setFilters(prev => ({ ...prev, overdue: !prev.overdue }))}
                >
                  <Ionicons name="warning" size={14} color="#FFFFFF" />
                  <Text style={styles.overdueBadgeText}>
                    {filtered.filter(t => isOverdue(t)).length}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Botón mensajes */}
              {recentMessages.length > 0 && (
                <TouchableOpacity 
                  style={styles.headerIconBtn} 
                  onPress={() => {
                    hapticMedium();
                    setShowMessagesModal(true);
                  }}
                >
                  <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                  <View style={styles.msgBadge}>
                    <Text style={styles.msgBadgeText}>{recentMessages.length}</Text>
                  </View>
                </TouchableOpacity>
              )}
              
              {/* Botón ayuda */}
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => { hapticLight(); setShowHelpModal(true); }}
                accessibilityRole="button"
                accessibilityLabel="Ayuda"
              >
                <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Botón crear */}
              <TouchableOpacity style={styles.addButton} onPress={goToCreate} accessibilityRole="button" accessibilityLabel="Agregar">
                <Ionicons name="add" size={26} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Búsqueda compacta */}
      <View style={[styles.searchCompact, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.75)', borderBottomColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <View style={[styles.searchRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar tareas..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={[styles.searchDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity 
            style={[styles.filterIconBtn, showFilters && { backgroundColor: theme.primary }]}
            onPress={() => setShowFilters(!showFilters)}
            accessibilityRole="button"
            accessibilityLabel="Opciones"
          >
            <Ionicons name="options" size={18} color={showFilters ? '#FFFFFF' : theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>



      {/* Chips de filtros activos */}
      {(filters.status.length > 0 || filters.priority.length > 0 || filters.area.length > 0 || filters.overdue || searchText) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
            {searchText && (
              <TouchableOpacity 
                style={[styles.activeFilterChip, { backgroundColor: theme.primary }]}
                onPress={() => setSearchText('')}
              >
                <Ionicons name="search" size={14} color="#FFFFFF" />
                <Text style={styles.activeFilterChipText}>"{searchText}"</Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {filters.overdue && (
              <TouchableOpacity 
                style={[styles.activeFilterChip, { backgroundColor: theme.error }]}
                onPress={() => setFilters(prev => ({ ...prev, overdue: false }))}
              >
                <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
                <Text style={styles.activeFilterChipText}>Vencidas</Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {filters.status.map(s => (
              <TouchableOpacity 
                key={s}
                style={[styles.activeFilterChip, { backgroundColor: theme.info }]}
                onPress={() => setFilters(prev => ({ ...prev, status: prev.status.filter(x => x !== s) }))}
              >
                <Text style={styles.activeFilterChipText}>{s}</Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
            {filters.priority.map(p => (
              <TouchableOpacity 
                key={p}
                style={[styles.activeFilterChip, { backgroundColor: p === 'alta' ? theme.error : p === 'media' ? theme.warning : theme.success }]}
                onPress={() => setFilters(prev => ({ ...prev, priority: prev.priority.filter(x => x !== p) }))}
              >
                <Text style={styles.activeFilterChipText}>{p}</Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
            {filters.area.map(a => (
              <TouchableOpacity 
                key={a}
                style={[styles.activeFilterChip, { backgroundColor: theme.secondary }]}
                onPress={() => setFilters(prev => ({ ...prev, area: prev.area.filter(x => x !== a) }))}
              >
                <Text style={styles.activeFilterChipText} numberOfLines={1}>{a.substring(0, 15)}</Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.clearAllChip, { borderColor: theme.primary }]}
              onPress={() => {
                setFilters({ status: [], priority: [], area: [], overdue: false });
                setSearchText('');
              }}
            >
              <Text style={[styles.clearAllChipText, { color: theme.primary }]}>Limpiar todo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Filtros expandibles - MEJORADO */}
      {/* 🎨 MODAL DE FILTROS AVANZADOS */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {/* HeaderModal */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="funnel" size={24} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Filtros Avanzados</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilters(false)} accessibilityRole="button" accessibilityLabel="Cerrar">
                <Ionicons name="close-circle" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Contenido con scroll */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
              {/* Estado */}
              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Ionicons name="bookmark-outline" size={16} color={theme.primary} />
                  <Text style={[styles.filterTitle, { color: theme.text }]}>ESTADO DE TAREA</Text>
                  <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.filterBadgeText}>{filters.status.length}</Text>
                  </View>
                </View>
                <View style={styles.filterOptions}>
                  {['pendiente', 'en_proceso', 'cerrada'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        filters.status.includes(status) && { ...styles.filterOptionActive, backgroundColor: theme.primary }
                      ]}
                      onPress={() => {
                        setFilters(prev => ({
                          ...prev,
                          status: prev.status.includes(status)
                            ? prev.status.filter(s => s !== status)
                            : [...prev.status, status]
                        }));
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {filters.status.includes(status) && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                        <Text style={[
                          styles.filterOptionText,
                          filters.status.includes(status) && { color: '#FFFFFF', fontWeight: '700' }
                        ]}>
                          {statusLabel(status)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Separador visual */}
              <View style={[styles.filterSeparator, { backgroundColor: theme.border }]} />

              {/* Prioridad */}
              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Ionicons name="flash-outline" size={16} color={theme.primary} />
                  <Text style={[styles.filterTitle, { color: theme.text }]}>NIVEL DE PRIORIDAD</Text>
                  <View style={[styles.filterBadge, { backgroundColor: theme.warning }]}>
                    <Text style={styles.filterBadgeText}>{filters.priority.length}</Text>
                  </View>
                </View>
                <View style={styles.filterOptions}>
                  {['baja', 'media', 'alta'].map(priority => {
                    const colors = { baja: theme.success, media: theme.warning, alta: theme.error };
                    return (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.filterOption,
                          filters.priority.includes(priority) && { 
                            ...styles.filterOptionActive, 
                            backgroundColor: colors[priority] 
                          }
                        ]}
                        onPress={() => {
                          setFilters(prev => ({
                            ...prev,
                            priority: prev.priority.includes(priority)
                              ? prev.priority.filter(p => p !== priority)
                              : [...prev.priority, priority]
                          }));
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {filters.priority.includes(priority) && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                          <Text style={[
                            styles.filterOptionText,
                            filters.priority.includes(priority) && { color: '#FFFFFF', fontWeight: '700' }
                          ]}>
                            {priority}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Separador visual */}
              <View style={[styles.filterSeparator, { backgroundColor: theme.border }]} />

              {/* Dirección / Área */}
              {uniqueAreas.length > 0 && (
                <>
                  <View style={styles.filterGroup}>
                    <View style={styles.filterGroupHeader}>
                      <Ionicons name="business-outline" size={16} color={theme.primary} />
                      <Text style={[styles.filterTitle, { color: theme.text }]}>DIRECCIÓN O ÁREA</Text>
                      <View style={[styles.filterBadge, { backgroundColor: theme.info }]}>
                        <Text style={styles.filterBadgeText}>{filters.area.length}</Text>
                      </View>
                    </View>
                    <View style={styles.filterOptions}>
                      {uniqueAreas.map(area => (
                        <TouchableOpacity
                          key={area}
                          style={[
                            styles.filterOption,
                            filters.area.includes(area) && { ...styles.filterOptionActive, backgroundColor: theme.info }
                          ]}
                          onPress={() => {
                            setFilters(prev => ({
                              ...prev,
                              area: prev.area.includes(area)
                                ? prev.area.filter(a => a !== area)
                                : [...prev.area, area]
                            }));
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {filters.area.includes(area) && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                            <Text style={[
                              styles.filterOptionText,
                              filters.area.includes(area) && { color: '#FFFFFF', fontWeight: '700' }
                            ]}>
                              {area}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Separador visual */}
                  <View style={[styles.filterSeparator, { backgroundColor: theme.border }]} />
                </>
              )}

              {/* Tareas vencidas */}
              <View style={styles.filterGroup}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    styles.filterOptionLarge,
                    { marginTop: 0 },
                    filters.overdue && {
                      ...styles.filterOptionActive,
                      backgroundColor: theme.error
                    }
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, overdue: !prev.overdue }))}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons
                      name={filters.overdue ? "alert-circle" : "alert-circle-outline"}
                      size={18}
                      color={filters.overdue ? '#FFFFFF' : theme.error}
                    />
                    <Text style={[
                      styles.filterOptionText,
                      styles.filterOptionLargeText,
                      filters.overdue && { color: '#FFFFFF', fontWeight: '700' }
                    ]}>
                      {filters.overdue ? '✓ MOSTRAR SOLO VENCIDAS' : 'MOSTRAR SOLO TAREAS VENCIDAS'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Botón para limpiar filtros */}
              {(filters.status.length > 0 || filters.priority.length > 0 || filters.area.length > 0 || filters.overdue) && (
                <>
                  <View style={[styles.filterSeparator, { backgroundColor: theme.border }]} />
                  <TouchableOpacity
                    style={[styles.clearFiltersBtn, { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(159, 34, 65, 0.05)' }]}
                    onPress={() => setFilters({ status: [], priority: [], area: [], overdue: false })}
                  >
                    <Ionicons name="refresh" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.clearFiltersBtnText, { color: theme.primary }]}>RESETEAR TODOS LOS FILTROS</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Footer con acciones */}
            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalFooterBtnSecondary, { borderColor: theme.textSecondary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={[styles.modalFooterBtnText, { color: theme.text }]}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalFooterBtnPrimary, { backgroundColor: theme.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={[styles.modalFooterBtnText, { color: '#FFFFFF' }]}>APLICAR FILTROS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN PARA CERRAR TAREA */}
      <Modal
        visible={showCloseConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCloseConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="checkmark-circle" size={48} color={theme.success} />
            </View>
            <Text style={[styles.confirmModalTitle, { color: theme.text }]}>
              ¿Cerrar esta tarea?
            </Text>
            <Text style={[styles.confirmModalSubtitle, { color: theme.textSecondary }]}>
              {taskToClose?.title || 'Esta tarea'}
            </Text>
            <Text style={[styles.confirmModalDesc, { color: theme.textSecondary }]}>
              La tarea será marcada como completada y no podrá deshacerse fácilmente.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalBtn, styles.confirmModalBtnCancel, { borderColor: theme.border }]}
                onPress={() => {
                  setShowCloseConfirm(false);
                  setTaskToClose(null);
                }}
              >
                <Text style={[styles.confirmModalBtnText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalBtn, styles.confirmModalBtnConfirm]}
                onPress={confirmClose}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.confirmModalBtnTextWhite}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE AYUDA - BOTONES RÁPIDOS */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.helpModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.helpModalHeader}>
              <Ionicons name="help-circle" size={32} color={theme.primary} />
              <Text style={[styles.helpModalTitle, { color: theme.text }]}>Guía de Mi Bandeja</Text>
            </View>

            <View style={styles.helpModalItem}>
              <View style={[styles.helpModalIcon, { backgroundColor: theme.secondary }]}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.helpModalTextContainer}>
                <Text style={[styles.helpModalItemTitle, { color: theme.text }]}>Confirmar participación</Text>
                <Text style={[styles.helpModalItemDesc, { color: theme.textSecondary }]}>
                  Acepta tu parte de la tarea cuando hay múltiples asignados
                </Text>
              </View>
            </View>

            <View style={styles.helpModalItem}>
              <View style={[styles.helpModalIcon, { backgroundColor: theme.success }]}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.helpModalTextContainer}>
                <Text style={[styles.helpModalItemTitle, { color: theme.text }]}>Cerrar tarea</Text>
                <Text style={[styles.helpModalItemDesc, { color: theme.textSecondary }]}>
                  Marca la tarea como completada (requiere confirmación)
                </Text>
              </View>
            </View>

            <View style={styles.helpModalItem}>
              <View style={[styles.helpModalIcon, { backgroundColor: theme.info }]}>
                <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.helpModalTextContainer}>
                <Text style={[styles.helpModalItemTitle, { color: theme.text }]}>Chat de tarea</Text>
                <Text style={[styles.helpModalItemDesc, { color: theme.textSecondary }]}>
                  Abre la conversación de la tarea para comunicarte con el equipo
                </Text>
              </View>
            </View>

            <View style={styles.helpModalItem}>
              <View style={[styles.helpModalIcon, { backgroundColor: theme.warning }]}>
                <Ionicons name="warning" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.helpModalTextContainer}>
                <Text style={[styles.helpModalItemTitle, { color: theme.text }]}>Alerta de riesgo (IA)</Text>
                <Text style={[styles.helpModalItemDesc, { color: theme.textSecondary }]}>
                  Las tareas con "Riesgo alto" o "Riesgo medio" tienen mayor probabilidad de retrasarse según el historial del área
                </Text>
              </View>
            </View>

            <View style={styles.helpModalItem}>
              <View style={[styles.helpModalIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="options" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.helpModalTextContainer}>
                <Text style={[styles.helpModalItemTitle, { color: theme.text }]}>Filtros avanzados</Text>
                <Text style={[styles.helpModalItemDesc, { color: theme.textSecondary }]}>
                  Usa el botón ⊞ en la barra de búsqueda para filtrar por estado, prioridad, área y vencidas
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.helpModalCloseBtn, { backgroundColor: theme.primary }]}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.helpModalCloseBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Barra de acciones - Solo cuando hay selección */}
      {selectedTaskIds.size > 0 && (
        <View style={[styles.actionsBar, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.95)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
          <View style={styles.actionsBarLeft}>
            <View style={styles.selectionInfo}>
              <View style={[styles.selectionBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.selectionBadgeText}>{selectedTaskIds.size}</Text>
              </View>
              <Text style={[styles.selectionText, { color: theme.text }]}>
                {selectedTaskIds.size === 1 ? 'tarea seleccionada' : 'tareas seleccionadas'}
              </Text>
            </View>
          </View>
          
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: theme.error }]}
              onPress={deleteSelectedTasks}
              accessibilityRole="button"
              accessibilityLabel="Eliminar"
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: theme.textSecondary }]}
              onPress={() => setSelectedTaskIds(new Set())}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Toggle vista compacta */}
      <View style={[styles.compactToggleRow, { backgroundColor: 'transparent' }]}>
        <TouchableOpacity
          style={[
            styles.compactToggleBtn,
            { backgroundColor: compactView ? theme.primary : (isDark ? theme.glass : theme.glassStrong) }
          ]}
          onPress={() => {
            hapticLight();
            setCompactView(!compactView);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={compactView ? 'Vista normal' : 'Vista compacta'}
          accessibilityRole="button"
        >
          <Ionicons
            name={compactView ? 'list' : 'grid-outline'}
            size={16}
            color={compactView ? '#fff' : theme.text}
          />
          <Text style={{ color: compactView ? '#fff' : theme.text, fontSize: 12, marginLeft: 4 }}>
            {compactView ? 'Normal' : 'Compacto'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de mensajes */}
      <Modal
        visible={showMessagesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessagesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="chatbubbles" size={24} color="#DAA520" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Mensajes Recientes</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMessagesModal(false)} accessibilityRole="button" accessibilityLabel="Cerrar">
                <Ionicons name="close-circle" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {recentMessages.map((msg, idx) => (
                <TouchableOpacity
                  key={`msg-${msg.taskId}-${msg.id}-${idx}`}
                  style={[styles.messageCard, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#F5DEB3'
                  }]}
                  onPress={() => {
                    setShowMessagesModal(false);
                    navigation.navigate('TaskChat', { taskId: msg.taskId, taskTitle: msg.taskTitle });
                  }}
                >
                  <View style={styles.messageHeader}>
                    <Ionicons name="document-text-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.messageTaskTitle, { color: theme.text }]} numberOfLines={1}>
                      {msg.taskTitle || 'Sin título'}
                    </Text>
                  </View>
                  <Text style={[styles.messageAuthor, { color: theme.primary }]}>
                    {msg.author || 'Anónimo'}
                  </Text>
                  <Text style={[styles.messageText, { color: theme.textSecondary }]} numberOfLines={2}>
                    {msg.text || ''}
                  </Text>
                  <Text style={[styles.messageTime, { color: theme.textTertiary }]}>
                    {(() => {
                      try {
                        if (msg.createdAt?.toDate) {
                          return new Date(msg.createdAt.toDate()).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } else if (msg.createdAt?.seconds) {
                          return new Date(toMs(msg.createdAt)).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        }
                        return 'Reciente';
                      } catch {
                        return 'Reciente';
                      }
                    })()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        windowSize={5}
        maxToRenderPerBatch={6}
        initialNumToRender={8}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
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
            icon="file-tray-outline"
            title="¡Bandeja vacía!"
            message="No tienes tareas en este momento. ¡Descansa y disfruta! 🎉"
            variant="success"
          />
        }
      />
      </View>

    </View>
  );
}
