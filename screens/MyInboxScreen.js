// screens/MyInboxScreen.js
// "Mi bandeja" - lista de tareas asignadas al usuario actual, ordenadas por fecha de vencimiento.
// Acciones rápidas: marcar cerrada y posponer 1 día. Abre detalle y chat.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Modal, ScrollView, TextInput, Animated, Easing, Platform, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import TaskItem from '../components/TaskItem';
import EmptyState from '../components/EmptyState';
import ShimmerEffect from '../components/ShimmerEffect';
import { updateTask, deleteTask as deleteTaskFirebase } from '../services/tasks';
import { scheduleNotificationForTask, cancelNotification } from '../services/notifications';
import { hapticMedium, hapticLight } from '../utils/haptics';
import { useNotification } from '../contexts/NotificationContext';
import { isTaskAssignedToUser } from '../utils/taskHelpers';
import { deleteManager } from '../utils/deleteManager';
import { confirmTaskCompletion, hasUserConfirmed } from '../services/taskConfirmations';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { scheduleOverdueTasksNotification, scheduleMultipleDailyOverdueNotifications } from '../services/notifications';
import OverdueAlert from '../components/OverdueAlert';
import { useResponsive } from '../utils/responsive';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';
import { isOverdue, toMs } from '../utils/dateUtils';
import SyncIndicator from '../components/SyncIndicator';
import { getDireccionesBySecretaria } from '../config/areas';


export default function MyInboxScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, columns, padding } = useResponsive();
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
  }, []);

  useEffect(() => {
    // 💾 al montar: restaurar tareas en proceso de borrado
    restoreDeletingTasks();
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
  }, [currentUser?.email]);

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
      
      // Filtro de estado
      if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;
      
      // Filtro de prioridad
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;
      
      // Filtro de dirección/área
      if (filters.area.length > 0 && !filters.area.includes(task.area)) return false;
      
      // Filtro de vencidas
      if (filters.overdue && !isOverdue(task)) return false;
      
      return true;
    })
    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));

  // Contar tareas vencidas
  const overdueTasks = filtered.filter(task => isOverdue(task));
  const overdueCount = overdueTasks.length;

  // Conteo por estado para chips de filtro rápido (basado en tareas del usuario)
  const baseFilteredTasks = tasks.filter(task => {
    if (!currentUser) return false;
    const userRole = currentUser.role;
    const userEmail = currentUser.email?.toLowerCase();
    const userArea = currentUser.area || currentUser.department || '';
    if (userRole === 'admin') return true;
    if (userRole === 'secretario') {
      const taskAreaLower = (task.area || '').toLowerCase().trim();
      const userAreaLower = (userArea || '').toLowerCase().trim();
      const misDirecciones = getDireccionesBySecretaria(userAreaLower);
      return taskAreaLower === userAreaLower || misDirecciones.some(d => d?.toLowerCase().trim() === taskAreaLower) || isTaskAssignedToUser(task, userEmail) || task.createdBy?.toLowerCase().trim() === userEmail;
    }
    if (userRole === 'director') {
      // 🔒 Director ve SOLO:
      // 1. Tareas asignadas DIRECTAMENTE a él
      // 2. Tareas de su área que NO están asignadas a otra persona
      // 3. Tareas que él creó
      const normalizedUserEmail = userEmail?.toLowerCase().trim();
      const taskArea = (task.area || '').toLowerCase().trim();
      const normalizedUserArea = userArea?.toLowerCase().trim();
      
      // ✅ Si está asignado directamente al director
      if (isTaskAssignedToUser(task, userEmail)) return true;
      
      // ✅ Si la creó él
      if (task.createdBy?.toLowerCase().trim() === normalizedUserEmail) return true;
      
      // 🔍 Verificar si el área coincide
      if (taskArea === normalizedUserArea) {
        // ⚠️ Si hay alguien asignado y NO es el director, NO mostrar
        const hasAssignment = task.assignedTo && 
          (Array.isArray(task.assignedTo) ? task.assignedTo.length > 0 : task.assignedTo.trim() !== '');
        
        if (hasAssignment && !isTaskAssignedToUser(task, userEmail)) {
          return false;
        }
        return true;
      }
      
      return false;
    }
    return isTaskAssignedToUser(task, userEmail);
  });
  
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
  }, [overdueCount]); // Solo cuando cambia de 0 a >0 o viceversa

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

  const postponeOneDay = async (task) => {
    try {
      hapticMedium();
      const newDue = (task.dueAt || Date.now()) + 24 * 3600 * 1000; // +1 día
      const updatedTask = { ...task, dueAt: newDue };
      
      // Cancelar notificación previa
      if (task.notificationId) await cancelNotification(task.notificationId);
      
      // Reprogramar notificación 10 minutos antes
      const notifId = await scheduleNotificationForTask(updatedTask, { minutesBefore: 10 });
      
      await updateTask(task.id, { 
        dueAt: newDue,
        notificationId: notifId || task.notificationId
      });
      showSuccess('Tarea pospuesta 1 día');
      // La actualización del estado se hace automáticamente por el listener
    } catch (e) {
      showError('Error al posponer: ' + e.message);
    }
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
            .catch(error => {
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

    // Guardar tarea para posible undo
    const taskToDelete = tasks.find(t => t.id === taskId);
    
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
      .catch(error => {
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
        .catch(err => {
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
      .catch(err => {
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

  // 📊 Calcular estadísticas rápidas para Quick Stats
  const quickStats = React.useMemo(() => {
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

  // 📋 Organizar tareas en secciones
  const taskSections = React.useMemo(() => {
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
    await updateTask(task.id, { status: newStatus });
  };

  const openDetail = (task) => {
    // Admin, secretario, y director pueden editar tareas
    const canEdit = currentUser && ['admin', 'secretario', 'director'].includes(currentUser.role);
    if (!canEdit) {
      showInfo('No tienes permisos para editar tareas');
      return;
    }
    navigation.navigate('TaskDetail', { task });
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
    // Solo admin puede eliminar tareas
    const isAdmin = currentUser?.role === 'admin';
    const isSelected = selectedTaskIds.has(item.id);
    const isDeleting = deletingTaskIds.has(item.id);
    
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'flex-start',
          backgroundColor: isDeleting ? '#FFE5E5' : (isSelected ? '#E3F2FD' : 'transparent'),
          borderRadius: 8,
          padding: 8,
          gap: 8
        }}>
          {/* Checkbox para multi-select */}
          {isAdmin && (
            <TouchableOpacity 
              onPress={() => toggleTaskSelection(item.id)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: isSelected ? theme.primary : '#DDD',
                backgroundColor: isSelected ? theme.primary : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 4
              }}
            >
              {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
            </TouchableOpacity>
          )}

          {/* Indicador visual prominente de "Borrando..." */}
          {isDeleting && (
            <View style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 69, 69, 0.9)',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 100,
              flexDirection: 'row',
              gap: 12
            }}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 3,
                borderColor: '#FFF',
                borderTopColor: 'transparent',
                transform: [{ rotate: '45deg' }]
              }} />
              <Text style={{ 
                color: '#FFF', 
                fontSize: 16, 
                fontWeight: '700',
                letterSpacing: 0.5
              }}>ELIMINANDO...</Text>
            </View>
          )}

          {/* TaskItem */}
          <View style={{ flex: 1 }}>
            <TaskItem 
              task={item} 
              compact={compactView}
              onPress={() => !isDeleting && openDetail(item)}
              onDelete={isAdmin ? () => deleteTask(item.id) : undefined}
              onToggleComplete={() => !isDeleting && toggleComplete(item)}
              onReopen={isAdmin ? () => !isDeleting && updateTask(item.id, { status: 'pendiente' }) : undefined}
              isDeleting={isDeleting}
            />
          </View>
        </View>

        {/* Acciones compactas con iconos - Simplificadas - Ocultas en vista compacta */}
        {!compactView && item.status !== 'cerrada' && (
          <View style={styles.quickActionsRow}>
            {/* Botón confirmar mi parte - Solo si tiene múltiples asignados y no ha confirmado */}
            {Array.isArray(item.assignedTo) && item.assignedTo.length > 1 && !hasUserConfirmed(item, currentUser?.email) && (
              <TouchableOpacity 
                style={[styles.quickActionBtn, { backgroundColor: '#8B5CF6' }]} 
                onPress={() => confirmMyPart(item)}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.quickActionBtn, { backgroundColor: '#10B981' }]} 
              onPress={() => markClosed(item)}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickActionBtn, { backgroundColor: '#3B82F6' }]} 
              onPress={() => openChat(item)}
            >
              <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity 
                style={[styles.quickActionBtn, { backgroundColor: '#EF4444' }]} 
                onPress={() => deleteTask(item.id)}
              >
                <Ionicons name="trash" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
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
            colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
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
              <View key={i} style={{ backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 12 }}>
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
          colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
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
              >
                <Ionicons name="help-circle-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Botón crear */}
              <TouchableOpacity style={styles.addButton} onPress={goToCreate}>
                <Ionicons name="add" size={26} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Búsqueda compacta */}
      <View style={[styles.searchCompact, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
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
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={[styles.searchDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity 
            style={[styles.filterIconBtn, showFilters && { backgroundColor: theme.primary }]}
            onPress={() => setShowFilters(!showFilters)}
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
                style={[styles.activeFilterChip, { backgroundColor: '#EF4444' }]}
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
                style={[styles.activeFilterChip, { backgroundColor: '#3B82F6' }]}
                onPress={() => setFilters(prev => ({ ...prev, status: prev.status.filter(x => x !== s) }))}
              >
                <Text style={styles.activeFilterChipText}>{s}</Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
            {filters.priority.map(p => (
              <TouchableOpacity 
                key={p}
                style={[styles.activeFilterChip, { backgroundColor: p === 'alta' ? '#EF4444' : p === 'media' ? '#F59E0B' : '#10B981' }]}
                onPress={() => setFilters(prev => ({ ...prev, priority: prev.priority.filter(x => x !== p) }))}
              >
                <Text style={styles.activeFilterChipText}>{p}</Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
            {filters.area.map(a => (
              <TouchableOpacity 
                key={a}
                style={[styles.activeFilterChip, { backgroundColor: '#8B5CF6' }]}
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
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="funnel" size={24} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Filtros Avanzados</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
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
                  {['pendiente', 'en progreso', 'cerrada'].map(status => (
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
                          {status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Separador visual */}
              <View style={[styles.filterSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />

              {/* Prioridad */}
              <View style={styles.filterGroup}>
                <View style={styles.filterGroupHeader}>
                  <Ionicons name="flash-outline" size={16} color={theme.primary} />
                  <Text style={[styles.filterTitle, { color: theme.text }]}>NIVEL DE PRIORIDAD</Text>
                  <View style={[styles.filterBadge, { backgroundColor: '#FF9500' }]}>
                    <Text style={styles.filterBadgeText}>{filters.priority.length}</Text>
                  </View>
                </View>
                <View style={styles.filterOptions}>
                  {['baja', 'media', 'alta'].map(priority => {
                    const colors = { baja: '#4CAF50', media: '#FF9500', alta: '#FF3B30' };
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
              <View style={[styles.filterSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />

              {/* Dirección / Área */}
              {uniqueAreas.length > 0 && (
                <>
                  <View style={styles.filterGroup}>
                    <View style={styles.filterGroupHeader}>
                      <Ionicons name="business-outline" size={16} color={theme.primary} />
                      <Text style={[styles.filterTitle, { color: theme.text }]}>DIRECCIÓN O ÁREA</Text>
                      <View style={[styles.filterBadge, { backgroundColor: '#3B82F6' }]}>
                        <Text style={styles.filterBadgeText}>{filters.area.length}</Text>
                      </View>
                    </View>
                    <View style={styles.filterOptions}>
                      {uniqueAreas.map(area => (
                        <TouchableOpacity
                          key={area}
                          style={[
                            styles.filterOption,
                            filters.area.includes(area) && { ...styles.filterOptionActive, backgroundColor: '#3B82F6' }
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
                  <View style={[styles.filterSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />
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
                      backgroundColor: '#FF3B30' 
                    }
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, overdue: !prev.overdue }))}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons 
                      name={filters.overdue ? "alert-circle" : "alert-circle-outline"} 
                      size={18} 
                      color={filters.overdue ? '#FFFFFF' : '#FF3B30'} 
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
                  <View style={[styles.filterSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />
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
            <View style={[styles.modalFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]}>
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
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
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
              <View style={[styles.helpModalIcon, { backgroundColor: '#8B5CF6' }]}>
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
              <View style={[styles.helpModalIcon, { backgroundColor: '#10B981' }]}>
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
              <View style={[styles.helpModalIcon, { backgroundColor: '#3B82F6' }]}>
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
              <View style={[styles.helpModalIcon, { backgroundColor: '#F59E0B' }]}>
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
              <View style={[styles.helpModalIcon, { backgroundColor: '#6366F1' }]}>
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
        <View style={[styles.actionsBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
              style={[styles.bulkActionBtn, { backgroundColor: '#EF4444' }]}
              onPress={deleteSelectedTasks}
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: theme.textSecondary }]}
              onPress={() => setSelectedTaskIds(new Set())}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Toggle vista compacta */}
      <View style={[styles.compactToggleRow, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.compactToggleBtn,
            { backgroundColor: compactView ? theme.primary : (isDark ? '#2a2a2a' : '#f0f0f0') }
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
              <TouchableOpacity onPress={() => setShowMessagesModal(false)}>
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
                    <Ionicons name="document-text-outline" size={14} color={isDark ? '#AAA' : '#666'} style={{ marginRight: 6 }} />
                    <Text style={[styles.messageTaskTitle, { color: theme.text }]} numberOfLines={1}>
                      {msg.taskTitle || 'Sin título'}
                    </Text>
                  </View>
                  <Text style={[styles.messageAuthor, { color: theme.primary }]}>
                    {msg.author || 'Anónimo'}
                  </Text>
                  <Text style={[styles.messageText, { color: isDark ? '#AAA' : '#666' }]} numberOfLines={2}>
                    {msg.text || ''}
                  </Text>
                  <Text style={[styles.messageTime, { color: isDark ? '#888' : '#999' }]}>
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
        windowSize={5}
        maxToRenderPerBatch={6}
        initialNumToRender={8}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9F2241"
            colors={['#9F2241']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="inbox-outline"
            title="¡Bandeja vacía!"
            message="No tienes tareas en este momento. ¡Descansa y disfruta! 🎉"
            variant="success"
          />
        }
      />
      <SyncIndicator />
      </View>

    </View>
  );
}

const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%'
  },
  headerGradient: {
    borderBottomLeftRadius: 24,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: padding,
    paddingTop: isDesktop ? 32 : 48,
    paddingBottom: 20
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heading: { 
    fontSize: 26, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  overdueBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.primary,
  },
  msgBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  // Búsqueda compacta
  searchCompact: {
    paddingHorizontal: padding,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  // Tarjeta usuario y búsqueda unificada
  userSearchCard: {
    marginHorizontal: padding,
    marginTop: -12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  searchDivider: {
    width: 1,
    height: 20,
  },
  filterIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Barra de acciones
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: padding,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionsBarLeft: {
    flex: 1,
  },
  counterInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  counterNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Acciones rápidas de tarea (iconos)
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginTop: -4,
  },
  quickActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  // Quick Stats
  quickStatsContainer: {
    marginTop: 12,
    paddingHorizontal: padding,
  },
  quickStatsScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
  },
  quickStatOverdue: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  quickStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B91C1C',
  },
  // Active Filters Chips
  activeFiltersContainer: {
    marginTop: 10,
    paddingHorizontal: padding,
  },
  activeFiltersScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 100,
  },
  clearAllChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  clearAllChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messagesButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md
  },
  messageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5
  },
  messageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  addButtonGradient: {
    width: isDesktop ? 56 : isTablet ? 54 : 60,
    height: isDesktop ? 56 : isTablet ? 54 : 60,
    borderRadius: isDesktop ? 28 : isTablet ? 27 : 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  addButtonText: {
    color: theme.primary,
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: padding,
    marginTop: isDesktop ? SPACING.xxxl : isTablet ? SPACING.xxl : SPACING.xxl,
    marginBottom: isDesktop ? SPACING.lg : isTablet ? SPACING.md : SPACING.md,
    padding: isDesktop ? SPACING.lg : isTablet ? SPACING.md : SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#9F2241',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#9F2241',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userInfoContent: {
    flex: 1,
  },
  userLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  userLabel: {
    fontSize: isDesktop ? 10 : 11,
    color: theme.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  currentUserName: {
    fontSize: isDesktop ? 18 : isTablet ? 17 : 18,
    fontWeight: '800',
    marginBottom: 2,
    flexShrink: 1,
    letterSpacing: -0.3,
  },
  currentUserHint: {
    fontSize: isDesktop ? 13 : 14,
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: 0.1
  },
  listContent: {
    padding: isDesktop ? 20 : isTablet ? 16 : 16,
    paddingTop: isDesktop ? 32 : 24,
    paddingBottom: 80
  },
  messagesSection: {
    marginHorizontal: isDesktop ? 20 : isTablet ? 16 : 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(218, 165, 32, 0.5)',
    backgroundColor: isDark ? 'rgba(218, 165, 32, 0.15)' : 'rgba(218, 165, 32, 0.1)',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3
  },
  messagesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messagesSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#DAA520',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  messageCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E9D5FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageTaskTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    color: theme.text,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    color: theme.textSecondary,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  messageTime: {
    fontSize: 11,
    fontStyle: 'italic',
    color: isDark ? '#888' : '#999',
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xxl || 32,
    borderTopRightRadius: RADIUS.xxl || 32,
    maxHeight: '85%',
    padding: 0,
    paddingBottom: 32,
    ...SHADOWS.xl,
    backgroundColor: theme.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isDesktop ? SPACING.xl : SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 2,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.15)' : '#F3E5F5'
  },
  modalTitle: {
    fontSize: isDesktop ? 24 : 26,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  modalScroll: {
    padding: isDesktop ? SPACING.xl : SPACING.lg
  },
  actionsRow: { 
    flexDirection: 'row', 
    flexWrap: isTablet ? 'nowrap' : 'wrap',
    marginTop: 18,
    gap: isDesktop ? 14 : isTablet ? 12 : 10,
    justifyContent: 'space-between'
  },
  actionBtn: {
    flex: isTablet ? 1 : 0.48,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFAF0',
    paddingVertical: isDesktop ? SPACING.md : isTablet ? 12 : 12,
    paddingHorizontal: isDesktop ? SPACING.md : isTablet ? SPACING.sm : SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.3)' : '#F5DEB3',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: isDesktop ? 48 : isTablet ? 44 : 44,
    marginBottom: isTablet ? 0 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  actionBtnPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  actionBtnDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444'
  },
  actionText: {
    fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 0.2,
    flexShrink: 0,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: isDesktop ? 140 : 120,
    paddingHorizontal: isDesktop ? 80 : 60
  },
  emptyText: {
    fontSize: isDesktop ? 32 : 30,
    fontWeight: '900',
    color: theme.text,
    marginBottom: 18,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  emptySubtext: {
    fontSize: isDesktop ? 17 : 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  // 🔍 ESTILOS DE BÚSQUEDA Y FILTROS
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: padding,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E0E0E0',
  },
  filtersPanel: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0',
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  filterSeparator: {
    height: 1,
    marginVertical: SPACING.md,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterGroup: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0',
    backgroundColor: theme.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  filterOptionLarge: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  filterOptionActive: {
    borderColor: 'transparent',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 0.3,
  },
  filterOptionLargeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    marginTop: SPACING.md,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  clearFiltersBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  counterSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  deleteSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FF3B30',
  },
  // 🎨 ESTILOS DEL FOOTER DEL MODAL
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    backgroundColor: theme.card,
    borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0',
  },
  modalFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  modalFooterBtnSecondary: {
    backgroundColor: 'transparent',
    borderColor: theme.textSecondary,
  },
  modalFooterBtnPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  modalFooterBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // 🎨 ESTILOS MODAL CONFIRMACIÓN CERRAR
  confirmModalContent: {
    width: isDesktop ? 400 : '85%',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  confirmModalIcon: {
    marginBottom: SPACING.md,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  confirmModalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  confirmModalDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  confirmModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
  },
  confirmModalBtnCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmModalBtnConfirm: {
    backgroundColor: '#10B981',
  },
  confirmModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmModalBtnTextWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 🎨 ESTILOS MODAL AYUDA
  helpModalContent: {
    width: isDesktop ? 420 : '90%',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  helpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E5E5',
  },
  helpModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  helpModalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  helpModalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpModalTextContainer: {
    flex: 1,
  },
  helpModalItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  helpModalItemDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  helpModalCloseBtn: {
    marginTop: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  helpModalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Estilos para filtros rápidos
  quickFiltersScroll: {
    paddingVertical: 8,
  },
  quickFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  quickFilterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickFilterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  quickFilterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
