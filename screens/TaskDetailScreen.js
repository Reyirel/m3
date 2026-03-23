// screens/TaskDetailScreen.js
// Formulario para crear o editar una tarea. Incluye DateTimePicker y programación de notificación.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, Alert, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Modal, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTask, updateTask, deleteTask } from '../services/tasks';
import { getAllUsersNames, getTitularesByAreas } from '../services/roles';
import TaskCreator from '../services/TaskCreator';
import useTaskCreation from '../hooks/useTaskCreation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { scheduleNotificationForTask, cancelNotification, notifyAssignment } from '../services/notifications';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';
import ShakeInput from '../components/ShakeInput';
import LoadingIndicator from '../components/LoadingIndicator';
import PressableButton from '../components/PressableButton';
import PomodoroTimer from '../components/PomodoroTimer';
import TagInput from '../components/TagInput';
import TaskStatusButtons from '../components/TaskStatusButtons';
import MultiUserSelector from '../components/MultiUserSelector';
import { toMs } from '../utils/dateUtils';
import { findSimilarTasks, suggestTaskMetadata, generateSubtasks, suggestPriority, suggestDueDate } from '../utils/aiFeatures';
import { addSubtask } from '../services/tasksMultiple';
import SuggestedDirectionsPanel from '../components/SuggestedDirectionsPanel';
import SuggestedDirectorsPanel from '../components/SuggestedDirectorsPanel';
import SuggestedAreasPanel from '../components/SuggestedAreasPanel';
import SubtasksList from '../components/SubtasksList';
import AreaSelectorModal from '../components/AreaSelectorModal';
import AssigneeProgress from '../components/AssigneeProgress';
import AreaCoordinationProgress from '../components/AreaCoordinationProgress';
import { confirmTaskCompletion, removeTaskConfirmation, hasUserConfirmed } from '../services/taskConfirmations';
import { useTheme } from '../contexts/ThemeContext';
import { savePomodoroSession } from '../services/pomodoro';
import { AREAS } from '../config/areas';
import { getAreaType, getSecretariaByDireccion, SECRETARIAS, resolveAreaName } from '../config/areas';
import { 
  canEditTask, 
  canDelegateTask, 
  canCreateSubtask, 
  canChangeTaskStatus,
  canDeleteTask,
  canCreateTask,
  canAssignAreaSubtask,
  getPermissionsSummary,
  ROLES 
} from '../services/permissions';
import { createAreaSubtasks, getAreaSubtasks, subscribeToAreaSubtasks, getAreaProgressSummary } from '../services/areaSubtasks';

// Importar DateTimePicker solo en móvil
let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function TaskDetailScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { currentUser, tasks } = useTasks();
  // Si route.params.task está presente, estamos editando; si no, creamos nueva
  const editingTask = route.params?.task || null;

  // Función para obtener mañana a las 9am por defecto
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  };

  const [title, setTitle] = useState(editingTask ? editingTask.title : '');
  const [description, setDescription] = useState(editingTask ? editingTask.description : '');
  
  // Estado para múltiples asignados
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  
  // 🔥 Handler personalizado para selección de usuarios que auto-agrega áreas
  const handleAssigneesChange = (newAssignees) => {
    // Actualizar lista de asignados
    setSelectedAssignees(newAssignees);
    
    // 🔥 AUTO-AGREGAR ÁREAS: Cuando se selecciona un usuario, agregar su área automáticamente
    if (newAssignees.length > 0) {
      const areasToAdd = new Set();
      
      newAssignees.forEach(user => {
        
        // Para todos los roles: agregar su área principal
        if (user.area) {
          areasToAdd.add(user.area);
        }
        
        // Para directores: solo su área directa
        if (user.role === 'director' && user.area) {
          areasToAdd.add(user.area);
        }
        
        // Para secretarios: agregar su secretaría y todas sus direcciones
        if (user.role === 'secretario') {
          if (user.area) areasToAdd.add(user.area);
          if (Array.isArray(user.direcciones)) {
            user.direcciones.forEach(dir => areasToAdd.add(dir));
          }
          if (Array.isArray(user.areasPermitidas)) {
            user.areasPermitidas.forEach(area => areasToAdd.add(area));
          }
        }
      });
      
      // Agregar las áreas nuevas a las existentes
      if (areasToAdd.size > 0) {
        setSelectedAreas(prevAreas => {
          const newAreas = [...new Set([...prevAreas, ...Array.from(areasToAdd)])];
          return newAreas;
        });
      }
    }
  };
  
  // Mantener backward compatibility
  const [assignedTo, setAssignedTo] = useState(editingTask ? editingTask.assignedTo : '');
  
  // Múltiples áreas
  const [selectedAreas, setSelectedAreas] = useState(
    editingTask?.areas && Array.isArray(editingTask.areas) 
      ? editingTask.areas 
      : (editingTask?.area ? [editingTask.area] : [])
  );
  const [priority, setPriority] = useState(editingTask ? editingTask.priority : 'media');
  const [status, setStatus] = useState(editingTask ? editingTask.status : 'pendiente');
  const [dueAt, setDueAt] = useState(editingTask ? new Date(toMs(editingTask.dueAt)) : getDefaultDate());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // 🔥 Función para obtener los asignados actuales de la tarea original
  const getOriginalAssignees = () => {
    if (!editingTask) return [];
    const original = editingTask.assignedTo || editingTask.assignments || [];
    if (Array.isArray(original)) {
      return original.map(item => 
        typeof item === 'string' ? item : item.email || item
      ).map(e => e?.toLowerCase().trim()).filter(Boolean);
    }
    return [];
  };
  
  // 🔥 Función para detectar cambios en asignados
  const detectAssigneeChanges = () => {
    if (!editingTask) return null; // No es edición
    
    const originalAssignees = getOriginalAssignees();
    const newAssignees = selectedAssignees
      .map(u => u.email?.toLowerCase().trim())
      .filter(Boolean);
    
    // Comparar arrays
    const originalSet = new Set(originalAssignees);
    const newSet = new Set(newAssignees);
    
    // Detectar si hubo cambios
    const hasChanges = originalAssignees.length !== newAssignees.length || 
                       ![...originalSet].every(a => newSet.has(a));
    
    if (hasChanges) {
      return {
        original: originalAssignees,
        new: newAssignees,
        removed: originalAssignees.filter(a => !newSet.has(a)),
        added: newAssignees.filter(a => !originalSet.has(a))
      };
    }
    
    return null;
  };
  
  const [isRecurring, setIsRecurring] = useState(editingTask ? editingTask.isRecurring || false : false);
  const [recurrencePattern, setRecurrencePattern] = useState(editingTask ? editingTask.recurrencePattern || 'daily' : 'daily');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(dueAt);
  const [peopleNames, setPeopleNames] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const userRole = currentUser?.role ?? null;
  const [canEdit, setCanEdit] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [canDelegate, setCanDelegate] = useState(false);
  const [canAddSubtask, setCanAddSubtask] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateUsers, setDelegateUsers] = useState([]);
  
  // Modal de selección de área
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaSearchQuery, setAreaSearchQuery] = useState('');
  
  const [saveProgress, setSaveProgress] = useState(null);
  
  // Estado de confirmaciones por asignado
  const [assigneeConfirmations, setAssigneeConfirmations] = useState([]);
  
  // Modal de confirmación cuando hay cambios en asignados
  const [showAssigneeChangeConfirm, setShowAssigneeChangeConfirm] = useState(false);
  const [assigneeChangeData, setAssigneeChangeData] = useState(null);
  
  // Pomodoro & Tags state
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [tags, setTags] = useState(editingTask?.tags || []);
  const [estimatedHours, setEstimatedHours] = useState(editingTask?.estimatedHours?.toString() || '');
  
  // Expandir opciones avanzadas automáticamente si hay datos
  useEffect(() => {
    if (editingTask && (editingTask.tags?.length > 0 || editingTask.estimatedHours || editingTask.isRecurring)) {
      setShowAdvancedOptions(true);
    }
  }, [editingTask]);
  
  // Refs para inputs
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  // ─── IA Features 2, 3, 4 ────────────────────────────────────────────────────
  const [similarTasks, setSimilarTasks] = useState([]);       // Feature 2: duplicados
  const [metaSuggestion, setMetaSuggestion] = useState(null); // Feature 3: área/responsable
  const [prioritySuggestion, setPrioritySuggestion] = useState(null); // Feature 6: prioridad
  const [dateSuggestion, setDateSuggestion] = useState(null); // Feature 8: fecha
  const [showAiSubtasksModal, setShowAiSubtasksModal] = useState(false); // Feature 4
  const [aiSubtaskOptions, setAiSubtaskOptions] = useState([]); // { title, checked }
  const [aiPendingSubtasks, setAiPendingSubtasks] = useState([]); // seleccionadas para crear
  const aiDebounceRef = useRef(null);

  // Disparar análisis de IA cuando cambia el título (solo al crear)
  useEffect(() => {
    if (editingTask || !title || title.length < 6) {
      setSimilarTasks([]);
      setMetaSuggestion(null);
      setPrioritySuggestion(null);
      setDateSuggestion(null);
      return;
    }
    clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(() => {
      setSimilarTasks(findSimilarTasks(title, tasks));
      const suggestion = suggestTaskMetadata(title, tasks);
      setMetaSuggestion(suggestion.area ? suggestion : null);
      // Feature 6: sugerencia de prioridad
      const pSug = suggestPriority(title, description);
      setPrioritySuggestion(pSug.priority && pSug.priority !== 'baja' ? pSug : null);
      // Feature 8: sugerencia de fecha
      const dSug = suggestDueDate(title, selectedAreas[0] || '', tasks);
      setDateSuggestion(dSug.suggestedDate ? dSug : null);
    }, 600);
    return () => clearTimeout(aiDebounceRef.current);
  }, [title, tasks, editingTask]);

  const hasUnsavedChanges = editingTask
    ? title !== (editingTask.title ?? '') || description !== (editingTask.description ?? '')
    : title.trim() !== '' || description.trim() !== '';

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      if (Platform.OS === 'web') {
        if (window.confirm('¿Descartar cambios? Los datos no guardados se perderán.')) {
          navigation.goBack();
        }
      } else {
        Alert.alert(
          'Descartar cambios',
          '¿Deseas salir sin guardar? Los cambios se perderán.',
          [
            { text: 'Seguir editando', style: 'cancel' },
            { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
          ]
        );
      }
    } else {
      navigation.goBack();
    }
  }, [hasUnsavedChanges, navigation]);
  
  // Inicializar hook de creación de tareas
  const { saveTask, deleteTask: deleteTaskService, isLoading: isTaskLoading, progress: taskProgress } = useTaskCreation();
  
  // Animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const saveSuccessAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const priorities = ['baja', 'media', 'alta'];
  const statuses = currentUser?.role === 'admin'
    ? ['pendiente', 'en_proceso', 'en_revision', 'cerrada']
    : ['pendiente', 'en_proceso', 'en_revision'];

  // Mapeo de áreas a departamentos (usar useMemo para evitar recrear objetos)
  const areaToDepMap = useMemo(() => ({
    'Jurídica': 'juridica',
    'Obras': 'obras',
    'Tesorería': 'tesoreria',
    'Administración': 'administracion',
    'Recursos Humanos': 'rrhh'
  }), []);

  const depToAreaMap = useMemo(() => ({
    'juridica': 'Jurídica',
    'obras': 'Obras',
    'tesoreria': 'Tesorería',
    'administracion': 'Administración',
    'rrhh': 'Recursos Humanos'
  }), []);

  // Filtrar áreas según el rol del usuario
  const availableAreas = useMemo(() => {
    if (!currentUser) return AREAS;
    
    // Admin ve todas las áreas
    if (currentUser.role === 'admin') return AREAS;
    
    // Secretario solo ve su área principal y sus direcciones
    if (currentUser.role === 'secretario') {
      const secretarioAreas = [];
      
      // Agregar el área principal del secretario
      if (currentUser.area) {
        secretarioAreas.push(currentUser.area);
      }
      
      // Agregar las direcciones a cargo
      if (currentUser.direcciones && Array.isArray(currentUser.direcciones)) {
        secretarioAreas.push(...currentUser.direcciones);
      }
      
      // También usar areasPermitidas si está definido
      if (currentUser.areasPermitidas && Array.isArray(currentUser.areasPermitidas)) {
        currentUser.areasPermitidas.forEach(area => {
          if (!secretarioAreas.includes(area)) {
            secretarioAreas.push(area);
          }
        });
      }
      
      // Filtrar AREAS para solo mostrar las que coinciden EXACTAMENTE
      if (secretarioAreas.length > 0) {
        return AREAS.filter(area => secretarioAreas.includes(area));
      }
      
      // Si no tiene áreas definidas, solo mostrar su área principal
      return currentUser.area ? [currentUser.area] : [];
    }
    
    // Director solo ve su área específica
    if (currentUser.role === 'director') {
      if (currentUser.area) {
        return AREAS.filter(area => area === currentUser.area);
      }
      return [];
    }
    
    return AREAS;
  }, [currentUser]);

  // 🔥 NUEVO: Filtrar áreas según los usuarios seleccionados (para admin)
  // Usa el mapeo oficial de SECRETARIAS_DIRECCIONES para obtener las direcciones correctas
  const areasFromSelectedUsers = useMemo(() => {
    // Importar el mapeo de áreas
    const { SECRETARIAS_DIRECCIONES, getDireccionesBySecretaria } = require('../config/areas');
    
    // Solo para admin - filtrar áreas según usuarios seleccionados
    if (!currentUser || currentUser.role !== 'admin') return availableAreas;
    
    // Si no hay usuarios seleccionados, mostrar todas las áreas
    if (!selectedAssignees || selectedAssignees.length === 0) return availableAreas;
    
    // Recopilar todas las áreas de los usuarios seleccionados
    const userAreas = new Set();
    
    selectedAssignees.forEach(user => {
      // Agregar área principal (normalizada para evitar alias duplicados)
      if (user.area) userAreas.add(resolveAreaName(user.area));
      if (user.department && user.department !== user.area) userAreas.add(resolveAreaName(user.department));

      // Agregar areasPermitidas (campo clave para directores)
      if (Array.isArray(user.areasPermitidas)) {
        user.areasPermitidas.filter(Boolean).forEach(ap => userAreas.add(resolveAreaName(ap)));
      }

      if (user.role === 'secretario') {
        const areaSecretario = resolveAreaName(user.area || '');
        
        // Usar direcciones del propio usuario
        if (Array.isArray(user.direcciones)) {
          user.direcciones.filter(Boolean).forEach(dir => userAreas.add(resolveAreaName(dir)));
        }
        
        // Obtener direcciones del mapeo oficial
        const direcciones = getDireccionesBySecretaria(areaSecretario);
        if (direcciones.length > 0) {
          userAreas.add(areaSecretario);
          direcciones.forEach(dir => userAreas.add(dir));
        } else {
          // Coincidencia parcial genérica
          for (const [secretaria, dirs] of Object.entries(SECRETARIAS_DIRECCIONES)) {
            // Extraer palabra clave de la secretaría para comparar
            const keywords = secretaria.replace(/Secretaría\s+(de|del|General)\s*/gi, '').split(/[,\s]+/).filter(w => w.length > 4);
            if (keywords.some(kw => areaSecretario.includes(kw))) {
              userAreas.add(secretaria);
              dirs.forEach(dir => userAreas.add(dir));
            }
          }
        }
      }
    });
    
    // Si encontramos áreas de usuarios, filtrar
    if (userAreas.size > 0) {
      return AREAS.filter(area => userAreas.has(area));
    }
    
    return availableAreas;
  }, [currentUser, selectedAssignees, availableAreas]);

  // 🔥 MEJORADO: Auto-seleccionar TODAS las áreas de los usuarios seleccionados
  useEffect(() => {
    if (!selectedAssignees || selectedAssignees.length === 0) return;
    
    // Recopilar TODAS las áreas de los usuarios seleccionados
    const userAreasSet = new Set();
    
    selectedAssignees.forEach(user => {
      // Agregar área principal (normalizada para evitar alias duplicados)
      if (user.area) {
        userAreasSet.add(resolveAreaName(user.area));
      }

      // Agregar department/región
      if (user.department && user.department !== user.area) {
        userAreasSet.add(resolveAreaName(user.department));
      }

      // Para secretarios, agregar todas sus direcciones permitidas
      if (user.role === 'secretario') {
        if (Array.isArray(user.direcciones)) {
          user.direcciones.filter(Boolean).forEach(dir => userAreasSet.add(resolveAreaName(dir)));
        }
        if (Array.isArray(user.areasPermitidas)) {
          user.areasPermitidas.filter(Boolean).forEach(area => userAreasSet.add(resolveAreaName(area)));
        }
      }
    });
    
    // Si encontramos áreas del usuario, hacer merge con selectedAreas
    if (userAreasSet.size > 0) {
      const userAreas = Array.from(userAreasSet);
      
      // Hacer merge: mantener áreas que ya están seleccionadas y agregar las nuevas
      const newSelectedAreas = [...new Set([...selectedAreas, ...userAreas])];
      
      // Solo actualizar si cambió algo (evitar re-renders innecesarios)
      if (JSON.stringify(newSelectedAreas) !== JSON.stringify(selectedAreas)) {
        setSelectedAreas(newSelectedAreas);
      }
    }
  }, [selectedAssignees]);

  // Referencia para trackear áreas previas y evitar ciclos
  const prevAreasRef = useRef([]);

  const filteredAreas = useMemo(() => {
    // Usar areasFromSelectedUsers en lugar de availableAreas para admin
    const baseAreas = currentUser?.role === 'admin' ? areasFromSelectedUsers : availableAreas;
    if (!areaSearchQuery.trim()) return baseAreas;
    const query = areaSearchQuery.toLowerCase();
    return baseAreas.filter(area => area.toLowerCase().includes(query));
  }, [areaSearchQuery, areasFromSelectedUsers, availableAreas, currentUser]);

  useEffect(() => {
    navigation.setOptions({ 
      title: editingTask ? 'Editar tarea' : 'Crear tarea',
      headerRight: () => editingTask ? (
        <TouchableOpacity 
          onPress={() => setShowPomodoroModal(true)}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="timer" size={24} color={theme.primary} />
        </TouchableOpacity>
      ) : null
    });
  }, [editingTask, theme, navigation]);

  useEffect(() => {
    loadUserNames();
    initializeAssignees();

    // Animar entrada del formulario
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (currentUser) checkPermissions(currentUser);
  }, [currentUser?.email]);

  // Inicializar asignados múltiples desde tarea existente
  const initializeAssignees = async () => {
    if (!editingTask) return;
    
    try {
      const names = await getAllUsersNames();
      
      // Backward compatibility: convertir assignedTo string a array
      let assigneesToConvert = [];
      
      if (editingTask.assignedToNames && Array.isArray(editingTask.assignedToNames)) {
        // Nueva estructura: ya es array
        const emails = editingTask.assignedTo || [];
        assigneesToConvert = Array.isArray(emails) ? emails : [emails];
      } else if (editingTask.assignments && Array.isArray(editingTask.assignments)) {
        // Si tiene array de assignments
        assigneesToConvert = editingTask.assignments.map(a => a.email || a);
      } else if (editingTask.assignedTo && typeof editingTask.assignedTo === 'string') {
        // Tarea antigua con string => convertir a array
        assigneesToConvert = [editingTask.assignedTo];
      }
      
      // Convertir a objetos con email y displayName
      const assigneesObjects = assigneesToConvert.map(email => ({
        email: email,
        displayName: names.includes(email) ? email : email
      }));
      
      setSelectedAssignees(assigneesObjects);
      
      // Inicializar estado de confirmaciones
      initializeConfirmations();
    } catch (error) {
      if (__DEV__) console.error('Error inicializando asignados:', error);
    }
  };
  
  // Inicializar confirmaciones de asignados
  const initializeConfirmations = () => {
    if (!editingTask) return;
    
    const assignedTo = editingTask.assignedTo || [];
    const assignedToNames = editingTask.assignedToNames || [];
    const completedBy = editingTask.completedBy || [];
    
    const confirmations = (Array.isArray(assignedTo) ? assignedTo : [assignedTo]).map((email, index) => {
      const confirmation = completedBy.find(c => c.email?.toLowerCase() === email?.toLowerCase());
      return {
        email,
        displayName: assignedToNames[index] || email,
        completed: !!confirmation,
        completedAt: confirmation?.completedAt || null
      };
    });
    
    setAssigneeConfirmations(confirmations);
  };
  
  // Confirmar mi parte de la tarea
  const handleConfirmMyPart = async () => {
    if (!editingTask || !currentUser) return;
    
    try {
      const result = await confirmTaskCompletion(editingTask.id, {
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email,
        area: currentUser.department || ''
      });
      
      showSuccess(result.allCompleted
        ? '¡Tarea lista para revisión!'
        : `Confirmado (${result.completedCount}/${result.totalAssigned})`
      );
      
      // Actualizar estado local
      initializeConfirmations();
      
      // Si todos confirmaron, actualizar status en pantalla
      if (result.allCompleted) {
        setStatus('en_revision');
      }
    } catch (error) {
      showError(error.message);
    }
  };

  // Quitar confirmación (solo admin)
  const handleRemoveConfirmation = async (userEmail) => {
    if (!editingTask) return;
    
    Alert.alert(
      'Quitar confirmación',
      '¿Quieres quitar la confirmación de este usuario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Quitar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTaskConfirmation(editingTask.id, userEmail);
              showSuccess('Confirmación removida');
              initializeConfirmations();
              setStatus('en_proceso');
            } catch (error) {
              showError(error.message);
            }
          }
        }
      ]
    );
  };

  const loadUserNames = async () => {
    const names = await getAllUsersNames();
    setPeopleNames(names);
  };

  const checkPermissions = (user) => {
    if (!user) return;
    const role = user.role;

    // BLOQUEAR creación de tareas principales para secretarios y directores
    if (!editingTask && (role === 'secretario' || role === 'director')) {
      Alert.alert(
        'Acción no permitida',
        role === 'secretario'
          ? 'Los secretarios solo pueden crear subtareas desde las tareas asignadas por el administrador.'
          : 'Los directores no pueden crear tareas. Contacta a tu secretario o administrador.',
        [{ text: 'Entendido', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (editingTask) {
      const editPermission = canEditTask(user, editingTask);
      const delegatePermission = canDelegateTask(user, editingTask);
      const subtaskPermission = canCreateSubtask(user, editingTask);

      setCanEdit(editPermission.canEdit);
      setCanDelegate(delegatePermission.canDelegate);
      setCanAddSubtask(subtaskPermission.canCreate);
      setIsReadOnly(role === 'director' || role === 'secretario');
    } else {
      const createPermission = canCreateTask(user);
      setCanEdit(createPermission.canCreate);
      setCanDelegate(false);
      setCanAddSubtask(false);
      setIsReadOnly(!createPermission.canCreate);
    }

    if ((role === 'secretario' || role === 'admin') && editingTask) {
      loadDelegateUsers(user);
    }
  };

  // Cargar usuarios disponibles para delegación
  const loadDelegateUsers = async (user) => {
    try {
      const delegatePermission = canDelegateTask(user, editingTask);
      if (!delegatePermission.canDelegate) return;

      // Obtener directores de las áreas permitidas
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'director'));
      const snapshot = await getDocs(q);

      const allowedAreas = delegatePermission.allowedAreas || [];
      const isAdmin = user.role === 'admin';
      const directors = [];

      snapshot.forEach(doc => {
        const userData = doc.data();
        // Admin puede ver todos los directores, secretario solo los de sus áreas
        if (isAdmin || allowedAreas.includes(userData.area)) {
          directors.push({
            email: userData.email,
            displayName: userData.displayName || userData.email,
            area: userData.area
          });
        }
      });

      setDelegateUsers(directors);
    } catch (error) {
      if (__DEV__) console.error('Error cargando usuarios para delegación:', error);
    }
  };

  const onChangeDate = useCallback((event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        // En Android, mostrar el time picker después de seleccionar la fecha
        setTimeout(() => setShowTimePicker(true), 100);
      } else {
        // En iOS, actualizar directamente
        const newDate = new Date(dueAt);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setDueAt(newDate);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  }, [dueAt]);

  const onChangeTime = useCallback((event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && selectedTime) {
      // Combinar fecha de tempDate con la hora seleccionada
      const finalDate = new Date(tempDate);
      finalDate.setHours(selectedTime.getHours());
      finalDate.setMinutes(selectedTime.getMinutes());
      setDueAt(finalDate);
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  }, [tempDate]);

  const save = async () => {
    if (isSaving) return; // Prevenir doble clic
    
    // Validaciones de campos
    if (!title.trim()) {
      titleInputRef.current?.shake();
      showError('El título es obligatorio');
      return;
    }

    if (title.trim().length < 3) {
      titleInputRef.current?.shake();
      showError('El título debe tener al menos 3 caracteres');
      return;
    }

    if (title.trim().length > 100) {
      titleInputRef.current?.shake();
      showError('El título no puede tener más de 100 caracteres');
      return;
    }

    if (!description.trim()) {
      descriptionInputRef.current?.shake();
      showError('La descripción es obligatoria');
      return;
    }

    if (description.trim().length < 10) {
      descriptionInputRef.current?.shake();
      showError('La descripción debe tener al menos 10 caracteres');
      return;
    }

    // Validar múltiples asignados
    if (!selectedAssignees || selectedAssignees.length === 0) {
      showError('Debes asignar la tarea a al menos una persona');
      return;
    }

    // Validar múltiples áreas
    if (!selectedAreas || selectedAreas.length === 0) {
      showError('Debes seleccionar al menos una área');
      return;
    }

    // 🔥 NUEVO: Detectar cambios en asignados al editar
    if (editingTask) {
      const changes = detectAssigneeChanges();
      if (changes) {
        // Mostrar modal de confirmación
        setAssigneeChangeData(changes);
        setShowAssigneeChangeConfirm(true);
        return; // No continuar, esperar confirmación del usuario
      }
    }

    // Validar que la fecha no sea demasiado en el pasado
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hora atrás
    if (!editingTask && dueAt.getTime() < oneHourAgo) {
      Alert.alert(
        'Fecha en el pasado',
        '¿Estás seguro de crear una tarea con fecha vencida?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => proceedWithSave() }
        ]
      );
      return;
    }

    await proceedWithSave();
  };

  // Helper para actualizar progreso del padre si es subtarea de área
  const updateParentProgressIfNeeded = async () => {
    if (editingTask?.isAreaSubtask && editingTask?.parentTaskId) {
      try {
        const { updateParentTaskProgress } = await import('../services/areaSubtasks');
        await updateParentTaskProgress(editingTask.parentTaskId);
      } catch (error) {
        if (__DEV__) console.error('[TaskDetail] Error actualizando progreso del padre:', error);
      }
    }
  };

  const proceedWithSave = async () => {
    setIsSaving(true);
    setSaveProgress(0);

    // Simular progreso
    const progressInterval = setInterval(() => {
      setSaveProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      // Validar autenticación
      if (!currentUser) {
        Alert.alert('Error', 'No estás autenticado');
        setIsSaving(false);
        clearInterval(progressInterval);
        return;
      }

      // Usar el hook simplificado para guardar
      const formData = {
        title: title.trim(),
        description: description.trim(),
        selectedAssignees,
        selectedAreas,
        priority,
        status,
        dueAt,
        tags,
        estimatedHours,
        isRecurring,
        recurrencePattern,
      };

      const result = await saveTask(formData, editingTask);

      clearInterval(progressInterval);
      setSaveProgress(100);

      if (result.success) {
        // Feature 4: crear subtareas sugeridas si hay alguna seleccionada (solo al crear)
        if (!editingTask && aiPendingSubtasks.length > 0 && result.taskId) {
          try {
            await Promise.all(
              aiPendingSubtasks.map(st => addSubtask(result.taskId, { title: st, description: '' }))
            );
          } catch (_) {
            // No bloquear si falla la creación de subtareas
          }
        }

        showSuccess(editingTask ? 'Tarea actualizada exitosamente' : 'Tarea creada exitosamente');

        // Navegar después de un breve delay
        setTimeout(() => {
          setSaveProgress(null);
          navigation.goBack();
        }, 1000);
      } else {
        showError(result.error || 'Error guardando tarea');
        setSaveProgress(null);
      }

      setIsSaving(false);
    } catch (e) {
      clearInterval(progressInterval);
      setIsSaving(false);
      setSaveProgress(null);
      showError(`Error al guardar: ${e.message || 'Error desconocido'}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Tarea',
      '¿Estás seguro que deseas eliminar esta tarea? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              const result = await deleteTaskService(editingTask.id);
              
              if (result.success) {
                showSuccess('Tarea eliminada correctamente');
                setTimeout(() => navigation.goBack(), 1000);
              } else {
                showError(result.error || 'Error al eliminar la tarea');
                setIsSaving(false);
              }
            } catch (error) {
              showError('Error al eliminar la tarea');
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Helper: auto-asignar solo director del área + secretario padre
  const autoAssignDirectorAndSecretario = useCallback(async (area) => {
    try {
      // Buscar titulares directos del área (director o secretario)
      const titulares = await getTitularesByAreas([area]);
      const director = titulares.find(u => u.role === 'director');
      let secretario = titulares.find(u => u.role === 'secretario');

      // Si el área es una dirección (no secretaría), buscar también al secretario padre
      if (!secretario) {
        const secretariaPadre = getSecretariaByDireccion(area);
        if (secretariaPadre) {
          const secretarios = await getTitularesByAreas([secretariaPadre]);
          secretario = secretarios.find(u => u.role === 'secretario');
        }
      }

      const toAdd = [director, secretario].filter(Boolean);
      if (toAdd.length > 0) {
        setSelectedAssignees(prev => {
          const existingEmails = new Set(prev.map(u => u.email?.toLowerCase()));
          const newUsers = toAdd
            .filter(u => !existingEmails.has(u.email?.toLowerCase()))
            .map(u => ({
              email: u.email,
              displayName: u.displayName || u.email,
              role: u.role,
              area: u.area || u.department || '',
              direcciones: u.direcciones || [],
              areasPermitidas: u.areasPermitidas || [],
            }));
          return newUsers.length > 0 ? [...prev, ...newUsers] : prev;
        });
      }
    } catch (error) {
      if (__DEV__) console.error('[AutoAssign] Error:', error);
    }
  }, []);

  // Memoizar handlers para evitar recrearlos en cada render
  const toggleAreaSelection = useCallback((a) => {
    const areaDep = areaToDepMap[a] || a.toLowerCase();
    
    // Determinar si puede seleccionar el área según el rol
    let canSelectArea = false;
    if (currentUser?.role === 'admin') {
      canSelectArea = canEdit && areasFromSelectedUsers.includes(a);
    } else if (currentUser?.role === 'secretario') {
      canSelectArea = canEdit && availableAreas.includes(a);
    }
    
    if (!canSelectArea) return;
    
    // Toggle: agregar o remover el área
    let isAdding = false;
    setSelectedAreas(prev => {
      if (prev.includes(a)) {
        return prev.length > 1 ? prev.filter(area => area !== a) : prev;
      } else {
        isAdding = true;
        return [...prev, a];
      }
    });

    // Auto-asignar director del área + secretario padre
    if (isAdding) {
      autoAssignDirectorAndSecretario(a);
    }
  }, [canEdit, currentUser, areaToDepMap, availableAreas, areasFromSelectedUsers, autoAssignDirectorAndSecretario]);

  const handlePriorityChange = useCallback((p) => {
    if (canEdit) setPriority(p);
  }, [canEdit]);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    setStatus(newStatus);
    await updateTask(taskId, { status: newStatus });
    
    // Si es una subtarea de coordinación, actualizar el progreso del padre
    if (editingTask?.isAreaSubtask && editingTask?.parentTaskId) {
      try {
        const { updateParentTaskProgress } = await import('../services/areaSubtasks');
        await updateParentTaskProgress(editingTask.parentTaskId);
      } catch (error) {
        if (__DEV__) console.error('[TaskDetail] Error actualizando progreso del padre:', error);
      }
    }
    
    // Mostrar mensaje de confirmación
    showSuccess('Tarea iniciada correctamente');
    
    // Cerrar el modal después de un breve delay
    setTimeout(() => {
      navigation.goBack();
    }, 1200);
  }, [navigation, editingTask]);

  // Función para delegar tarea a un director
  const handleDelegate = async (director) => {
    if (!editingTask || !director) return;
    
    // Verificar si es una subtarea de área
    if (editingTask.isAreaSubtask && currentUser) {
      const permission = canAssignAreaSubtask(currentUser, editingTask);
      if (!permission.canAssign) {
        Alert.alert('Sin permisos', permission.reason);
        return;
      }
      
      // Si el usuario es secretario, no permitir multi-asignación
      if (currentUser.role === 'secretario' && !permission.multiAssignAllowed) {
        // Verificar si ya hay asignados
        const currentAssignees = editingTask.assignedTo || [];
        if (currentAssignees.length > 0) {
          Alert.alert(
            'Una sola asignación permitida',
            'Las subtareas solo pueden asignarse a UN director. Para cambiar el asignado actual, elimina primero la asignación anterior.'
          );
          return;
        }
      }
    }
    
    try {
      setIsSaving(true);
      
      // Actualizar los asignados de la tarea
      const newAssignees = [director.email];
      const newAssigneesNames = [director.displayName];
      
      await updateTaskMultiple(editingTask.id, {
        assignedEmails: newAssignees,
        assignedTo: newAssignees,
        assignedToNames: newAssigneesNames
      });
      
      // Notificar al nuevo asignado
      try {
        const { notifyTaskAssigned } = await import('../services/emailNotifications');
        await notifyTaskAssigned({
          ...editingTask,
          assignedTo: newAssignees
        });
      } catch (notifError) {
      }
      
      showSuccess(`Tarea delegada a ${director.displayName}`);
      setShowDelegateModal(false);
      
      setTimeout(() => {
        navigation.goBack();
      }, 1200);
    } catch (error) {
      if (__DEV__) console.error('Error al delegar:', error);
      showError('Error al delegar la tarea');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Modal de detalles en modo solo lectura */}
      {isReadOnly && editingTask && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => navigation.goBack()}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={[styles.readOnlyModalContainer, { backgroundColor: theme.card }]}>
              {/* Header */}
              <View style={[styles.readOnlyHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.readOnlyTitle, { color: theme.text }]}>Detalles de la Tarea</Text>
                <TouchableOpacity 
                  onPress={() => navigation.goBack()}
                  style={styles.readOnlyCloseButton}
                >
                  <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView style={styles.readOnlyContent} showsVerticalScrollIndicator={true}>
                {/* Nombre */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Nombre de la Tarea</Text>
                  <View style={[styles.readOnlyField, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.readOnlyFieldText, { color: theme.text }]}>
                      {editingTask.title}
                    </Text>
                  </View>
                </View>

                {/* Descripción */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Lo que debes hacer</Text>
                  <View style={[styles.readOnlyFieldLarge, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.readOnlyFieldText, { color: theme.text }]}>
                      {editingTask.description || 'Sin descripción'}
                    </Text>
                  </View>
                </View>

                {/* Botones de cambio de estado */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Cambiar Estado</Text>
                  <TaskStatusButtons 
                    currentStatus={editingTask.status || 'pendiente'}
                    taskId={editingTask.id}
                    onStatusChange={handleStatusChange}
                    task={editingTask}
                  />
                </View>

                {/* Subtareas */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Subtareas</Text>
                  <SubtasksList
                    taskId={editingTask.id}
                    canEdit={canAddSubtask}
                    canDelegate={canDelegate}
                    delegateUsers={delegateUsers}
                    currentUser={currentUser}
                  />
                </View>

                {/* Coordinación entre Áreas (si es tarea multi-área) */}
                {editingTask?.isCoordinationTask && (
                  <View style={styles.readOnlySection}>
                    <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Progreso por Área</Text>
                    <AreaCoordinationProgress 
                      parentTaskId={editingTask.id}
                      currentUserArea={currentUser?.area}
                      onSubtaskPress={(subtask) => {
                        navigation.navigate('TaskDetail', { task: subtask });
                      }}
                    />
                  </View>
                )}

                {/* Botón para acceder a Reportes y Chat */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Más Opciones</Text>
                  <View style={{ gap: 12, marginTop: 10 }}>
                    {/* Botón Reportes */}
                    <TouchableOpacity
                      style={[styles.readOnlyActionButton, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        navigation.goBack();
                        setTimeout(() => {
                          navigation.navigate('TaskReportsAndActivity', { taskId: editingTask.id, taskTitle: editingTask.title });
                        }, 300);
                      }}
                    >
                      <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.readOnlyActionButtonText}>Ver/Enviar Reportes</Text>
                    </TouchableOpacity>

                    {/* Botón Chat */}
                    <TouchableOpacity
                      style={[styles.readOnlyActionButton, { backgroundColor: '#007AFF' }]}
                      onPress={() => {
                        navigation.goBack();
                        setTimeout(() => {
                          navigation.navigate('TaskChat', { taskId: editingTask.id, taskTitle: editingTask.title });
                        }, 300);
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.readOnlyActionButtonText}>Ir al Chat</Text>
                    </TouchableOpacity>

                    {/* Botón Delegar - Solo para secretarios con permiso */}
                    {canDelegate && currentUser?.role === 'secretario' && (
                      <TouchableOpacity
                        style={[styles.readOnlyActionButton, { backgroundColor: '#FF9800' }]}
                        onPress={() => setShowDelegateModal(true)}
                      >
                        <Ionicons name="people" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.readOnlyActionButtonText}>Delegar Tarea</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity 
                style={[styles.readOnlyCloseButtonBottom, { backgroundColor: theme.primary }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.readOnlyCloseButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Vista normal si no es read-only */}
      {!isReadOnly && (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.headerBar, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={handleBack} style={styles.closeButton} accessibilityLabel="Cerrar" accessibilityRole="button">
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons 
            name={editingTask ? 'pencil' : 'sparkles'} 
            size={20} 
            color="#FFFFFF" 
            style={{ marginRight: 8 }} 
          />
          <Text style={styles.headerTitle}>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</Text>
        </View>
        {editingTask && currentUser?.role === 'admin' && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Eliminar tarea" accessibilityRole="button">
            <Ionicons name="trash" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {!editingTask && <View style={{ width: 40 }} />}
      </View>
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        >
          {/* SECCIÓN BÁSICA */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <View style={{ backgroundColor: theme.primary + '15', padding: 10, borderRadius: 12 }}>
                <Ionicons name="document-text" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Información Básica</Text>
            </View>
            
            <Text style={styles.label}>TÍTULO *</Text>
            <ShakeInput
              ref={titleInputRef}
              value={title}
              onChangeText={setTitle}
              placeholder="¿Qué hay que hacer?"
              placeholderTextColor={isDark ? '#666' : '#A0A0A0'}
              style={styles.input}
              editable={canEdit}
              error={!title.trim() && title.length > 0}
              returnKeyType="next"
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
              blurOnSubmit={false}
              maxLength={120}
            />
            {canEdit && (
              <Text style={[styles.charCounter, { color: title.length > 100 ? theme.warning : theme.textTertiary }]}>
                {title.length}/120
              </Text>
            )}

            {/* IA Feature 2: Alerta de duplicado */}
            {similarTasks.length > 0 && (
              <View style={[styles.aiWarningCard, { backgroundColor: isDark ? '#2D2215' : '#FFFBF0', borderColor: '#F59E0B' }]}>
                <Ionicons name="copy-outline" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.aiWarningTitle, { color: '#F59E0B' }]}>Posible duplicado detectado</Text>
                  {similarTasks.slice(0, 2).map((r) => (
                    <TouchableOpacity key={r.task.id} onPress={() => navigation.navigate('TaskDetail', { task: r.task })}>
                      <Text style={[styles.aiWarningItem, { color: theme.textSecondary }]} numberOfLines={1}>
                        • "{r.task.title}" ({Math.round(r.score * 100)}% similar)
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* IA Feature 3: Sugerencia de área y responsable */}
            {metaSuggestion && (
              <View style={[styles.aiSuggestionCard, { backgroundColor: isDark ? '#152015' : '#F0FFF4', borderColor: '#10B981' }]}>
                <Ionicons name="sparkles" size={16} color="#10B981" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.aiWarningTitle, { color: '#10B981' }]}>Sugerencia IA</Text>
                  <Text style={[styles.aiWarningItem, { color: theme.textSecondary }]}>
                    Área: {metaSuggestion.area}{metaSuggestion.assignedTo ? ` · Responsable: ${metaSuggestion.assignedTo}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.aiApplyBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    if (metaSuggestion.area && !selectedAreas.includes(metaSuggestion.area)) {
                      setSelectedAreas([...selectedAreas, metaSuggestion.area]);
                    }
                    setMetaSuggestion(null);
                  }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>DESCRIPCIÓN *</Text>
            <ShakeInput
              ref={descriptionInputRef}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe los detalles de la tarea..."
              placeholderTextColor={isDark ? '#666' : '#A0A0A0'}
              style={[styles.input, {height: 100, textAlignVertical: 'top', paddingTop: 14}]}
              multiline
              editable={canEdit}
              error={!description.trim() && description.length > 0}
              maxLength={1000}
            />
            {canEdit && (
              <Text style={[styles.charCounter, { color: description.length > 900 ? theme.warning : theme.textTertiary }]}>
                {description.length}/1000
              </Text>
            )}

            {/* IA Feature 4: Generar subtareas */}
            {canEdit && title.length >= 6 && (
              <View>
                <TouchableOpacity
                  style={[styles.aiSubtasksBtn, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: '#6366F1' }]}
                  onPress={() => {
                    const result = generateSubtasks(title, description);
                    setAiSubtaskOptions(result.subtasks.map(st => ({ title: st, checked: true })));
                    setShowAiSubtasksModal(true);
                  }}
                >
                  <Ionicons name="sparkles" size={15} color="#6366F1" />
                  <Text style={[styles.aiSubtasksBtnText, { color: '#6366F1' }]}>Sugerir subtareas con IA</Text>
                </TouchableOpacity>
                {!editingTask && aiPendingSubtasks.length > 0 && (
                  <View style={[styles.aiPendingChips, { backgroundColor: isDark ? '#1A1A2E' : '#F5F3FF' }]}>
                    <Text style={[styles.aiPendingLabel, { color: theme.textSecondary }]}>
                      Se crearán {aiPendingSubtasks.length} subtarea{aiPendingSubtasks.length > 1 ? 's' : ''} al guardar:
                    </Text>
                    {aiPendingSubtasks.map((st, i) => (
                      <View key={`pending-${st}-${i}`} style={[styles.aiPendingChip, { backgroundColor: isDark ? '#2D2B5E' : '#E0E7FF' }]}>
                        <Text style={{ fontSize: 12, color: '#6366F1', flex: 1 }} numberOfLines={1}>{st}</Text>
                        <TouchableOpacity onPress={() => setAiPendingSubtasks(prev => prev.filter((_, j) => j !== i))}>
                          <Ionicons name="close-circle" size={14} color="#6366F1" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* SECCIÓN ASIGNACIÓN */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <View style={{ backgroundColor: theme.primary + '15', padding: 10, borderRadius: 12 }}>
                <Ionicons name="people" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Asignación y Área</Text>
            </View>
            
            {/* Selector de Asignados Múltiples */}
            <Text style={[styles.label, { marginTop: 8, marginBottom: 12 }]}>ASIGNADOS A *</Text>
            <View style={{ opacity: canEdit ? 1 : 0.5 }}>
              <MultiUserSelector
                selectedUsers={selectedAssignees}
                onSelectionChange={handleAssigneesChange}
                role={currentUser?.role || 'admin'}
                area={currentUser?.department || selectedAreas[0]}
                allowedAreas={currentUser?.direcciones || currentUser?.areasPermitidas || []}
              />
            </View>

            {/* Panel de Direcciones del Secretario Sugeridas */}
            <SuggestedDirectionsPanel
              selectedUsers={selectedAssignees}
              selectedAreas={selectedAreas}
              onAddArea={(area) => {
                if (!canEdit) return;
                if (!selectedAreas.includes(area)) {
                  setSelectedAreas([...selectedAreas, area]);
                  autoAssignDirectorAndSecretario(area);
                }
              }}
              theme={theme}
            />

            {/* Panel de Directores Sugeridos */}
            <SuggestedDirectorsPanel
              selectedUsers={selectedAssignees}
              onAddUser={(director) => {
                // Agregar el director a la lista de asignados y auto-seleccionar su área
                const newAssignees = [...selectedAssignees, director];
                handleAssigneesChange(newAssignees);
              }}
              theme={theme}
            />
            
            {/* Progreso de confirmaciones por asignado - Solo para tareas existentes con múltiples asignados */}
            {editingTask && assigneeConfirmations.length > 1 && (
              <AssigneeProgress
                assignees={assigneeConfirmations}
                currentUserEmail={currentUser?.email}
                onConfirm={handleConfirmMyPart}
                onRemoveConfirmation={currentUser?.role === 'admin' ? handleRemoveConfirmation : null}
                isAdmin={currentUser?.role === 'admin'}
              />
            )}

            {/* Selector de Múltiples Áreas */}
            <Text style={[styles.label, { marginTop: 28, marginBottom: 14 }]}>ÁREAS *</Text>
            
            {/* Mensaje informativo cuando hay usuarios seleccionados (solo admin) */}
            {currentUser?.role === 'admin' && selectedAssignees.length > 0 && (
              <View style={[styles.areaHintContainer, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
                <Ionicons name="information-circle" size={18} color={theme.primary} />
                <Text style={[styles.areaHintText, { color: theme.primary }]}>
                  {areasFromSelectedUsers.length === 1 
                    ? `Área auto-filtrada: ${areasFromSelectedUsers[0].replace('Dirección de ', '').replace('Secretaría de ', '')}` 
                    : `Mostrando ${areasFromSelectedUsers.length} áreas de ${selectedAssignees.length === 1 ? 'la persona' : 'las personas'} seleccionada${selectedAssignees.length > 1 ? 's' : ''}`
                  }
                </Text>
              </View>
            )}
            
            {/* Mostrar áreas seleccionadas como pills */}
            {selectedAreas.length > 0 && (
              <View style={styles.selectedAreasContainer}>
                {selectedAreas.map((a) => (
                  <View key={a} style={[styles.areaPill, { backgroundColor: theme.primary }]}>
                    <Ionicons name="folder" size={16} color="#FFFFFF" />
                    <Text style={styles.areaPillText} numberOfLines={1}>
                      {a.replace(/^Secretaría (de |del |General )?/i, '').replace(/^Dirección (de |del )?/i, '')}
                    </Text>
                    {canEdit && (
                      <TouchableOpacity 
                        onPress={() => toggleAreaSelection(a)}
                        style={styles.areaPillRemove}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {/* Botón para agregar más áreas */}
            <TouchableOpacity
              style={[
                styles.areaButton,
                {
                  borderColor: selectedAreas.length === 0 ? theme.primary : theme.primary,
                  backgroundColor: selectedAreas.length === 0 
                    ? (isDark ? theme.primary + '10' : theme.primary + '08')
                    : (isDark ? theme.primary + '15' : theme.primary + '08'),
                  opacity: canEdit ? 1 : 0.5,
                },
              ]}
              onPress={() => setShowAreaModal(true)}
              activeOpacity={0.8}
              disabled={!canEdit}
            >
              <View style={[
                styles.areaButtonIcon, 
                { backgroundColor: selectedAreas.length === 0 ? theme.primary : theme.primary }
              ]}>
                <Ionicons 
                  name={selectedAreas.length > 0 ? "add" : "folder-open"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </View>
              <View style={styles.areaButtonInfo}>
                <Text style={[
                  styles.areaButtonLabel, 
                  { color: selectedAreas.length === 0 ? theme.primary : theme.textSecondary }
                ]}>
                  {selectedAreas.length > 0 ? 'AGREGAR MÁS ÁREAS' : 'SELECCIONAR ÁREA'}
                </Text>
                <Text style={[
                  styles.areaButtonValue, 
                  { 
                    color: selectedAreas.length === 0 ? theme.text : theme.text,
                    fontWeight: selectedAreas.length === 0 ? '600' : '700'
                  }
                ]}>
                  {selectedAreas.length === 0 
                    ? 'Toca para asignar área' 
                    : `${selectedAreas.length} ${selectedAreas.length === 1 ? 'área' : 'áreas'} seleccionada${selectedAreas.length > 1 ? 's' : ''}`
                  }
                </Text>
              </View>
              <View style={[
                styles.areaButtonChevron, 
                { backgroundColor: theme.primary + '15' }
              ]}>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={theme.primary} 
                />
              </View>
            </TouchableOpacity>
          </View>
          {/* Modal de Selección de Área - Componente Mejorado */}
          <AreaSelectorModal
            visible={showAreaModal}
            onClose={() => setShowAreaModal(false)}
            selectedAreas={selectedAreas}
            onAreasChange={(areas) => {
              if (!canEdit) return;
              const prevAreas = selectedAreas;
              setSelectedAreas(areas);
              // Auto-asignar director+secretario para cada área nueva
              const added = areas.filter(a => !prevAreas.includes(a));
              added.forEach(a => autoAssignDirectorAndSecretario(a));
            }}
            allAreas={currentUser?.role === 'admin' ? areasFromSelectedUsers : availableAreas}
            theme={theme}
            isDark={isDark}
          />

          {/* Panel de Áreas Sugeridas */}
          <SuggestedAreasPanel
            selectedUsers={selectedAssignees}
            selectedAreas={selectedAreas}
            onAddArea={(area) => {
              if (!canEdit) return;
              if (!selectedAreas.includes(area)) {
                setSelectedAreas([...selectedAreas, area]);
                autoAssignDirectorAndSecretario(area);
              }
            }}
            theme={theme}
          />

          {/* SECCIÓN PRIORIDAD Y FECHA */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <View style={{ backgroundColor: theme.primary + '15', padding: 10, borderRadius: 12 }}>
                <Ionicons name="flag" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Prioridad y Fecha</Text>
            </View>
            
            <Text style={styles.label}>PRIORIDAD *</Text>
            <View style={styles.pickerRow}>
              {priorities.map((p, index) => {
                const priorityColors = {
                  'alta': '#E53935',
                  'media': '#FB8C00', 
                  'baja': '#43A047'
                };
                const isActive = priority === p;
                const pColor = priorityColors[p] || theme.primary;
                
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => handlePriorityChange(p)}
                    style={[
                      styles.optionBtn, 
                      isActive && [styles.optionBtnActive, { backgroundColor: pColor, borderColor: pColor }],
                      !canEdit && styles.optionBtnDisabled
                    ]}
                    disabled={!canEdit}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons 
                        name={isActive ? "flag" : "flag-outline"} 
                        size={18} 
                        color={isActive ? "#FFFFFF" : pColor} 
                      />
                      <Text style={[
                        styles.optionText, 
                        isActive && styles.optionTextActive,
                        !isActive && { color: pColor }
                      ]} numberOfLines={1}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sugerencia de prioridad IA — solo al crear */}
            {!editingTask && prioritySuggestion && priority !== prioritySuggestion.priority && (
              <View style={[styles.aiSuggestionCard, { backgroundColor: isDark ? '#1a1000' : '#FFFBEB', borderColor: '#F59E0B' }]}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.aiWarningTitle, { color: '#F59E0B' }]}>Sugerencia IA</Text>
                  <Text style={[styles.aiWarningItem, { color: theme.textSecondary }]}>
                    Prioridad sugerida: {prioritySuggestion.priority.charAt(0).toUpperCase() + prioritySuggestion.priority.slice(1)}
                    {prioritySuggestion.reason ? ` (${prioritySuggestion.reason})` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.aiApplyBtn, { backgroundColor: '#F59E0B' }]}
                  onPress={() => { setPriority(prioritySuggestion.priority); setPrioritySuggestion(null); }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>FECHA COMPROMISO *</Text>
            {/* Solo admin puede cambiar fecha al editar */}
            {editingTask && currentUser && !['admin'].includes(currentUser.role) ? (
              <View 
                style={[styles.datePickerButton, { borderColor: theme.border, backgroundColor: isDark ? 'rgba(150,150,150,0.1)' : 'rgba(150,150,150,0.05)', opacity: 0.7 }]}
              >
                <View style={styles.datePickerContent}>
                  <View style={[styles.datePickerIcon, { backgroundColor: theme.textSecondary }]}>
                    <Ionicons name="calendar" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.datePickerInfo}>
                    <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>
                      Fecha y hora (no editable)
                    </Text>
                    <Text style={[styles.datePickerValue, { color: theme.textSecondary }]}>
                      {dueAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={styles.datePickerTime}>
                      <Ionicons name="time" size={14} color={theme.textSecondary} />
                      <Text style={[styles.datePickerTimeText, { color: theme.textSecondary }]}>
                        {dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="lock-closed" size={18} color={theme.textSecondary} />
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.datePickerButton, { borderColor: theme.primary, backgroundColor: isDark ? `${theme.primary}15` : `${theme.primary}10` }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.datePickerContent}>
                  <View style={[styles.datePickerIcon, { backgroundColor: theme.primary }]}>
                    <Ionicons name="calendar" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.datePickerInfo}>
                    <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>
                      Fecha y hora
                    </Text>
                    <Text style={[styles.datePickerValue, { color: theme.text }]}>
                      {dueAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={styles.datePickerTime}>
                      <Ionicons name="time" size={14} color={theme.primary} />
                      <Text style={[styles.datePickerTimeText, { color: theme.textSecondary }]}>
                        {dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={theme.primary} />
                </View>
              </TouchableOpacity>
            )}

            {/* Sugerencia de fecha IA — solo al crear */}
            {!editingTask && dateSuggestion && (
              <View style={[styles.aiSuggestionCard, { backgroundColor: isDark ? '#001020' : '#EFF6FF', borderColor: '#3B82F6', marginTop: 8 }]}>
                <Ionicons name="sparkles" size={16} color="#3B82F6" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.aiWarningTitle, { color: '#3B82F6' }]}>Sugerencia IA</Text>
                  <Text style={[styles.aiWarningItem, { color: theme.textSecondary }]}>
                    Plazo sugerido: {dateSuggestion.basisDays} días
                    {dateSuggestion.source === 'historico' ? ' (basado en historial)' : ' (estándar por categoría)'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.aiApplyBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={() => { setDueAt(dateSuggestion.suggestedDate); setDateSuggestion(null); }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* SECCIÓN ESTADO (solo al editar) */}
          {editingTask && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.sectionHeaderSimple}>
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Estado</Text>
              </View>
              
              <Text style={styles.label}>ESTADO</Text>
              <View style={styles.pickerRow}>
                {statuses.map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleStatusChange(s)}
                    style={[styles.optionBtn, status === s && styles.optionBtnActive]}
                  >
                    <Text style={[styles.optionText, status === s && styles.optionTextActive]} numberOfLines={1} ellipsizeMode="tail">
                      {s === 'en_proceso' ? 'En proceso' : s === 'en_revision' ? 'En revisión' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* BOTÓN OPCIONES AVANZADAS */}
          <TouchableOpacity 
            style={[styles.advancedToggle, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <View style={styles.advancedToggleContent}>
              <Ionicons 
                name={showAdvancedOptions ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={theme.primary} 
              />
              <Text style={[styles.advancedToggleText, { color: theme.text }]}>
                {showAdvancedOptions ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
              </Text>
              {!showAdvancedOptions && (tags.length > 0 || estimatedHours || isRecurring) && (
                <View style={[styles.advancedBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.advancedBadgeText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={[styles.advancedToggleHint, { color: theme.textSecondary }]}>
              Etiquetas, tiempo estimado y recurrencia
            </Text>
          </TouchableOpacity>

          {/* OPCIONES AVANZADAS */}
          {showAdvancedOptions && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.sectionHeaderSimple}>
                <Ionicons name="settings" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Opciones Avanzadas</Text>
              </View>
              
              <Text style={styles.label}>TIEMPO ESTIMADO (HORAS)</Text>
              <TextInput
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                placeholder="Ej: 2.5"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                style={[styles.input, { color: theme.text }]}
                editable={canEdit}
              />

              <Text style={styles.label}>ETIQUETAS</Text>
              <TagInput
                tags={tags}
                onTagsChange={setTags}
                placeholder="Agregar etiquetas..."
                maxTags={10}
              />

              {/* Sección de Recurrencia */}
              <View style={[styles.formSection, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginTop: 16 }]}>
                <TouchableOpacity 
                  onPress={() => setIsRecurring(!isRecurring)}
                  disabled={!canEdit}
                  style={[styles.recurrenceHeader, { backgroundColor: isRecurring ? theme.primary + '10' : 'transparent' }]}
                >
                  <View style={styles.sectionHeader}>
                    <Ionicons name="repeat" size={22} color={isRecurring ? theme.primary : theme.textSecondary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Tarea Recurrente</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                        {isRecurring 
                          ? recurrencePattern === 'daily' ? 'Se repite cada día' 
                            : recurrencePattern === 'weekly' ? 'Se repite cada semana'
                            : 'Se repite cada mes'
                          : 'Activar para repetir automáticamente'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[
                    styles.toggleSwitch, 
                    { backgroundColor: isRecurring ? theme.primary : theme.border }
                  ]}>
                    <View style={[
                      styles.toggleThumb, 
                      isRecurring && styles.toggleThumbActive,
                      { backgroundColor: '#FFFFFF' }
                    ]} />
                  </View>
                </TouchableOpacity>
                
                {isRecurring && (
                  <View style={styles.recurrenceOptions}>
                    <Text style={[styles.recurrenceLabel, { color: theme.textSecondary }]}>Frecuencia:</Text>
                    {['daily', 'weekly', 'monthly'].map((pattern) => (
                      <TouchableOpacity
                        key={pattern}
                        onPress={() => setRecurrencePattern(pattern)}
                        style={[
                          styles.recurrenceOption,
                          { backgroundColor: theme.surface, borderColor: theme.border },
                          recurrencePattern === pattern && { 
                            borderColor: theme.primary, 
                            backgroundColor: theme.primary + '15',
                            borderWidth: 2
                          }
                        ]}
                        disabled={!canEdit}
                      >
                        <Ionicons 
                          name={pattern === 'daily' ? 'today' : pattern === 'weekly' ? 'calendar' : 'calendar-number'} 
                          size={24} 
                          color={recurrencePattern === pattern ? theme.primary : theme.textSecondary} 
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.recurrenceOptionText,
                            { color: recurrencePattern === pattern ? theme.primary : theme.text }
                          ]}>
                            {pattern === 'daily' ? 'Diaria' : pattern === 'weekly' ? 'Semanal' : 'Mensual'}
                          </Text>
                          <Text style={[
                            styles.recurrenceOptionDesc,
                            { color: theme.textSecondary }
                          ]}>
                            {pattern === 'daily' ? 'Se repite cada día' 
                              : pattern === 'weekly' ? 'Se repite cada 7 días'
                              : 'Se repite cada mes'}
                          </Text>
                        </View>
                        {recurrencePattern === pattern && (
                          <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
          
          {Platform.OS !== 'web' && (
            <>
              {showDatePicker && DateTimePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                  minimumDate={new Date()}
                />
              )}
              
              {showTimePicker && DateTimePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="default"
                  onChange={onChangeTime}
                  is24Hour={true}
                />
              )}
            </>
          )}

          {/* Modal de fecha y hora personalizado para web */}
          {Platform.OS === 'web' && (
            <Modal
              visible={showDatePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.dateModalOverlay}>
                <View style={[styles.dateModalContent, { backgroundColor: theme.card }]}>
                  {/* Header */}
                  <View style={[styles.dateModalHeader, { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dateModalTitle, { color: theme.text }]}>
                        ¿Cuándo vence?
                      </Text>
                      <Text style={[styles.dateModalSubtitle, { color: theme.textSecondary }]}>
                        Selecciona fecha y hora límite
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(false)}
                      style={[styles.dateCloseButton, { backgroundColor: `${theme.text}10` }]}
                    >
                      <Ionicons name="close" size={22} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Quick Select Options */}
                  <View style={styles.quickSelectContainer}>
                    {[
                      { label: 'Hoy', icon: 'today-outline', days: 0 },
                      { label: 'Mañana', icon: 'sunny-outline', days: 1 },
                      { label: 'En 3 días', icon: 'calendar-outline', days: 3 },
                      { label: 'Próx. semana', icon: 'calendar', days: 7 },
                    ].map((opt) => {
                      const targetDate = new Date();
                      targetDate.setDate(targetDate.getDate() + opt.days);
                      targetDate.setHours(18, 0, 0, 0);
                      const isSelected = tempDate.toDateString() === targetDate.toDateString();
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          onPress={() => {
                            const newDate = new Date();
                            newDate.setDate(newDate.getDate() + opt.days);
                            newDate.setHours(tempDate.getHours(), tempDate.getMinutes(), 0, 0);
                            setTempDate(newDate);
                          }}
                          style={[
                            styles.quickSelectBtn,
                            { backgroundColor: isSelected ? theme.primary : `${theme.text}08`, borderColor: isSelected ? theme.primary : 'transparent' }
                          ]}
                        >
                          <Ionicons name={opt.icon} size={18} color={isSelected ? '#FFFFFF' : theme.text} />
                          <Text style={[styles.quickSelectText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Body */}
                  <View style={styles.dateModalBody}>
                    <View style={styles.dateTimeRow}>
                      {/* Selector de Fecha */}
                      <View style={[styles.datePickerSection, { flex: 1.2 }]}>
                        <View style={styles.sectionLabelRow}>
                          <Ionicons name="calendar" size={16} color={theme.primary} />
                          <Text style={[styles.datePickerSectionTitle, { color: theme.text }]}>Fecha</Text>
                        </View>
                        <input
                          type="date"
                          value={tempDate.toISOString().split('T')[0]}
                          onChange={(e) => {
                            const [year, month, day] = e.target.value.split('-');
                            const newDate = new Date(tempDate);
                            newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                            setTempDate(newDate);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: '15px',
                            borderRadius: '12px',
                            border: `1.5px solid ${theme.border}`,
                            backgroundColor: `${theme.text}05`,
                            color: theme.text,
                            fontFamily: 'system-ui',
                            fontWeight: '600',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        />
                      </View>

                      {/* Selector de Hora */}
                      <View style={[styles.datePickerSection, { flex: 1 }]}>
                        <View style={styles.sectionLabelRow}>
                          <Ionicons name="time" size={16} color={theme.primary} />
                          <Text style={[styles.datePickerSectionTitle, { color: theme.text }]}>Hora</Text>
                        </View>
                        <input
                          type="time"
                          value={`${String(tempDate.getHours()).padStart(2, '0')}:${String(tempDate.getMinutes()).padStart(2, '0')}`}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(tempDate);
                            newDate.setHours(parseInt(hours), parseInt(minutes), 0);
                            setTempDate(newDate);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: '15px',
                            borderRadius: '12px',
                            border: `1.5px solid ${theme.border}`,
                            backgroundColor: `${theme.text}05`,
                            color: theme.text,
                            fontFamily: 'system-ui',
                            fontWeight: '600',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        />
                      </View>
                    </View>

                    {/* Vista previa mejorada */}
                    <View style={[styles.datePreviewCard, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}30` }]}>
                      <View style={[styles.datePreviewIconWrap, { backgroundColor: theme.primary }]}>
                        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.datePreviewCardDate, { color: theme.textSecondary }]}>
                          Fecha límite
                        </Text>
                        <Text style={[styles.datePreviewCardValue, { color: theme.text }]}>
                          {tempDate.toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long'
                          })}
                        </Text>
                        <Text style={[styles.datePreviewCardTime, { color: theme.primary }]}>
                          {tempDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} hrs
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={[styles.dateModalFooter, { borderTopColor: theme.border }]}>
                    <TouchableOpacity
                      style={[styles.dateModalButton, { backgroundColor: `${theme.textSecondary}20` }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={[styles.dateModalButtonText, { color: theme.textSecondary }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateModalButton, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        setDueAt(tempDate);
                        setShowDatePicker(false);
                      }}
                    >
                      <Ionicons name="checkmark" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={[styles.dateModalButtonText, { color: '#FFFFFF' }]}>
                        Confirmar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* SECCIÓN DE SUBTAREAS - Solo si estamos editando */}
          {editingTask && (
            <SubtasksList 
              taskId={editingTask.id}
              canEdit={canEdit || canAddSubtask}
              canDelegate={canDelegate}
              delegateUsers={delegateUsers}
              currentUser={currentUser}
            />
          )}

          {/* COORDINACIÓN ENTRE ÁREAS - Para tareas multi-secretaría */}
          {editingTask?.isCoordinationTask && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.sectionHeaderSimple}>
                <View style={{ backgroundColor: '#9C27B0' + '20', padding: 10, borderRadius: 12 }}>
                  <Ionicons name="git-branch" size={22} color="#9C27B0" />
                </View>
                <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Progreso por Área</Text>
              </View>
              <AreaCoordinationProgress 
                parentTaskId={editingTask.id}
                currentUserArea={currentUser?.area}
                onSubtaskPress={(subtask) => {
                  navigation.navigate('TaskDetail', { task: subtask });
                }}
              />
            </View>
          )}

          {/* BOTÓN DE DELEGACIÓN - Para secretarios (incluyendo área subtasks) y admin */}
          {editingTask && canDelegate && (currentUser?.role === 'secretario' || currentUser?.role === 'admin') && (
            <TouchableOpacity
              style={[styles.delegateButton, { backgroundColor: '#FF9800' }]}
              onPress={() => setShowDelegateModal(true)}
            >
              <Ionicons name="people" size={20} color="#FFFFFF" />
              <Text style={styles.delegateButtonText}>Delegar Tarea</Text>
            </TouchableOpacity>
          )}

          {/* BANNER INFORMATIVO PARA ROLES CON PERMISOS LIMITADOS */}
          {editingTask && !canEdit && (currentUser?.role === 'secretario' || currentUser?.role === 'director') && (
            <View style={[styles.permissionBanner, { backgroundColor: isDark ? '#2D2D2D' : '#FFF3E0', borderColor: '#FF9800' }]}>
              <Ionicons name="information-circle" size={24} color="#FF9800" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.permissionBannerTitle, { color: theme.text }]}>
                  {currentUser?.role === 'secretario' ? 'Modo Secretario' : 'Modo Director'}
                </Text>
                <Text style={[styles.permissionBannerText, { color: theme.textSecondary }]}>
                  {currentUser?.role === 'secretario' 
                    ? 'Puedes delegar tareas, crear subtareas y cambiar el estado.'
                    : 'Puedes cambiar el estado de la tarea.'}
                </Text>
              </View>
            </View>
          )}

          <PressableButton 
            onPress={save}
            disabled={isSaving}
            scaleValue={0.95}
            haptic={true}
          >
            <View style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              <Animated.View style={{ transform: [{ scale: buttonScale }], flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {isSaving && <ActivityIndicator color="#FFFFFF" size="small" />}
                {!isSaving && <Ionicons name={editingTask ? "checkmark-circle" : "add-circle"} size={20} color="#FFFFFF" />}
                <Text style={styles.saveButtonText}>
                  {isSaving 
                    ? 'Guardando...' 
                    : editingTask 
                      ? (canEdit ? 'Guardar Cambios' : 'Actualizar Estado')
                      : 'Crear Tarea'
                  }
                </Text>
              </Animated.View>
            </View>
          </PressableButton>

          {editingTask && (
            <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('TaskChat', { taskId: editingTask.id, taskTitle: editingTask.title })}>
              <Text style={styles.chatButtonText}>Abrir Chat</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
      
      {/* IA Feature 4: Modal de selección de subtareas sugeridas */}
      <Modal visible={showAiSubtasksModal} transparent animationType="slide" onRequestClose={() => setShowAiSubtasksModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={[styles.aiSubtasksModal, { backgroundColor: theme.background }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}>
              <Ionicons name="sparkles" size={22} color="#6366F1" />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 17, fontWeight: '700', color: theme.text }]}>Subtareas sugeridas</Text>
                <Text style={[{ fontSize: 12, color: theme.textSecondary }]}>Selecciona las que quieras agregar</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAiSubtasksModal(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {aiSubtaskOptions.map((opt, i) => (
                <TouchableOpacity
                  key={opt.title}
                  style={[styles.aiSubtaskRow, { backgroundColor: opt.checked ? (isDark ? '#1E1B4B' : '#EEF2FF') : (isDark ? '#2A2A2A' : '#F9F9F9'), borderColor: opt.checked ? '#6366F1' : theme.border }]}
                  onPress={() => setAiSubtaskOptions(prev => prev.map((o, j) => j === i ? { ...o, checked: !o.checked } : o))}
                >
                  <View style={[styles.aiSubtaskCheck, { backgroundColor: opt.checked ? '#6366F1' : 'transparent', borderColor: opt.checked ? '#6366F1' : theme.border }]}>
                    {opt.checked && <Ionicons name="checkmark" size={13} color="#FFF" />}
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: theme.text, lineHeight: 18 }}>{opt.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.aiSubtasksCancel, { borderColor: theme.border }]}
                onPress={() => setShowAiSubtasksModal(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiSubtasksConfirm, { backgroundColor: '#6366F1' }]}
                onPress={async () => {
                  const selected = aiSubtaskOptions.filter(o => o.checked).map(o => o.title);
                  setShowAiSubtasksModal(false);
                  if (editingTask) {
                    // Modo edición: crear subtareas directamente
                    try {
                      await Promise.all(
                        selected.map(st => addSubtask(editingTask.id, { title: st, description: '' }))
                      );
                      showSuccess(`${selected.length} subtarea${selected.length !== 1 ? 's' : ''} creada${selected.length !== 1 ? 's' : ''}`);
                    } catch (_) {
                      showError('No se pudieron crear las subtareas');
                    }
                  } else {
                    // Modo creación: guardar para crear al guardar la tarea
                    setAiPendingSubtasks(selected);
                  }
                }}
              >
                <Ionicons name="add-circle" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                  Agregar {aiSubtaskOptions.filter(o => o.checked).length} subtarea{aiSubtaskOptions.filter(o => o.checked).length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔥 MODAL DE CONFIRMACIÓN DE CAMBIOS EN ASIGNADOS */}
      <Modal
        visible={showAssigneeChangeConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAssigneeChangeConfirm(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.confirmModalContent, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.confirmModalTitle, { color: theme.text }]}>
                ⚠️ Cambios en Asignados
              </Text>
              <Text style={[styles.confirmModalSubtitle, { color: theme.textSecondary }]}>
                Se modificarán los responsables de esta tarea
              </Text>
            </View>
            
            {/* Contenido */}
            <ScrollView style={{ maxHeight: 300, marginBottom: 20 }} showsVerticalScrollIndicator={false}>
              {/* Asignados removidos */}
              {assigneeChangeData?.removed && assigneeChangeData.removed.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.changeLabel, { color: '#FF6B6B' }]}>Quitar acceso:</Text>
                  {assigneeChangeData.removed.map((email, idx) => (
                    <View key={idx} style={[styles.changeItem, { borderLeftColor: '#FF6B6B' }]}>
                      <Ionicons name="remove-circle" size={18} color="#FF6B6B" />
                      <Text style={[styles.changeEmail, { color: theme.text, marginLeft: 10 }]}>
                        {email}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Asignados agregados */}
              {assigneeChangeData?.added && assigneeChangeData.added.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.changeLabel, { color: '#51CF66' }]}>Agregar acceso:</Text>
                  {assigneeChangeData.added.map((email, idx) => (
                    <View key={idx} style={[styles.changeItem, { borderLeftColor: '#51CF66' }]}>
                      <Ionicons name="add-circle" size={18} color="#51CF66" />
                      <Text style={[styles.changeEmail, { color: theme.text, marginLeft: 10 }]}>
                        {email}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Mensaje de advertencia */}
              <View style={[styles.warningBox, { backgroundColor: isDark ? '#333' : '#FFF9E6' }]}>
                <Ionicons name="information-circle" size={20} color={isDark ? '#FFA500' : '#FF9800'} />
                <Text style={[styles.warningText, { color: isDark ? '#FFB84D' : '#E65100', marginLeft: 10 }]}>
                  Las personas removidas dejarán de ver esta tarea
                </Text>
              </View>
            </ScrollView>
            
            {/* Botones */}
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: isDark ? '#444' : '#F0F0F0' }]}
                onPress={() => setShowAssigneeChangeConfirm(false)}
              >
                <Text style={[styles.confirmButtonText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  setShowAssigneeChangeConfirm(false);
                  await proceedWithSave();
                }}
              >
                <Text style={[styles.confirmButtonText, { color: '#FFF' }]}>Confirmar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Pomodoro Modal */}
      {editingTask && (
        <Modal
          visible={showPomodoroModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPomodoroModal(false)}
        >
          <View style={[styles.pomodoroModal, { backgroundColor: theme.background }]}>
            <View style={styles.pomodoroHeader}>
              <Text style={[styles.pomodoroTitle, { color: theme.text }]}>Sesión de Trabajo</Text>
              <TouchableOpacity onPress={() => setShowPomodoroModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.pomodoroContent}>
              <PomodoroTimer
                taskId={editingTask.id}
                taskTitle={title}
                onSessionComplete={async (session) => {
                  try {
                    if (currentUser) {
                      await savePomodoroSession({
                        ...session,
                        userEmail: currentUser.email
                      });
                      showSuccess('Sesión Pomodoro completada!');
                    }
                  } catch (error) {
                    showError('Error al guardar sesión');
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      
      {saveProgress !== null && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <View style={{
            backgroundColor: '#FFF',
            padding: 24,
            borderRadius: 16,
            alignItems: 'center',
            gap: 12
          }}>
            <LoadingIndicator type="spinner" color={theme.primary} size={12} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
              {saveProgress === 100 ? '¡Completado!' : 'Guardando tarea...'}
            </Text>
          </View>
        </View>
      )}

        </KeyboardAvoidingView>
      )}

      {/* Modal de Delegación para Secretarios - FUERA del bloque isReadOnly */}
      <Modal
        visible={showDelegateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDelegateModal(false)}
      >
        <View style={styles.delegateModalOverlay}>
          <View style={[styles.delegateModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.delegateModalHeader}>
              <Text style={[styles.delegateModalTitle, { color: theme.text }]}>
                Delegar Tarea
              </Text>
              <TouchableOpacity onPress={() => setShowDelegateModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.delegateModalSubtitle, { color: theme.textSecondary }]}>
              Selecciona un director para asignarle esta tarea:
            </Text>

            {editingTask?.isAreaSubtask && currentUser?.role === 'secretario' && (
              <View style={[styles.delegateWarningBox, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
                <Ionicons name="warning" size={16} color="#FF6B6B" />
                <Text style={styles.delegateWarningText}>
                  Las subtareas solo pueden asignarse a UN director. Cada subtarea debe ser responsabilidad de una sola persona.
                </Text>
              </View>
            )}
            <ScrollView style={styles.delegateUsersList}>
              {delegateUsers.length === 0 ? (
                <View style={styles.noDelegateUsers}>
                  <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.noDelegateUsersText, { color: theme.textSecondary }]}>
                    No hay directores disponibles en tus áreas
                  </Text>
                </View>
              ) : (
                delegateUsers.map((director, index) => (
                  <TouchableOpacity
                    key={director.email}
                    style={[styles.delegateUserItem, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => handleDelegate(director)}
                  >
                    <View style={[styles.delegateUserAvatar, { backgroundColor: theme.primary }]}>
                      <Ionicons name="person" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.delegateUserInfo}>
                      <Text style={[styles.delegateUserName, { color: theme.text }]}>
                        {director.displayName}
                      </Text>
                      <Text style={[styles.delegateUserArea, { color: theme.textSecondary }]}>
                        {director.area}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={theme.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.delegateCancelButton, { backgroundColor: theme.border }]}
              onPress={() => setShowDelegateModal(false)}
            >
              <Text style={[styles.delegateCancelButtonText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  scrollContent: {
    padding: 16
  },
  label: {
    marginTop: 18,
    marginBottom: 10,
    color: isDark ? '#B8B8B8' : '#5A5A5A',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingLeft: 4,
  },
  charCounter: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginRight: 4,
  },
  input: { 
    padding: 16, 
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FAFAFA', 
    borderRadius: 14,
    color: theme.text,
    fontSize: 16,
    fontWeight: '500',
    shadowColor: isDark ? '#000' : theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(159, 34, 65, 0.12)',
    minHeight: 52,
    lineHeight: 22,
  },
  dateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6
  },
  dateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14
  },
  dateIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  dateTextContainer: {
    flex: 1
  },
  dateLabelSmall: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4
  },
  dateText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2
  },
  timeText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600'
  },
  pickerRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginTop: 12, 
    marginBottom: 10,
    gap: 12
  },
  optionBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', 
    borderRadius: 14,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    flex: 1,
    minWidth: 100,
  },
  optionBtnActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    transform: [{ scale: 1.02 }]
  },
  optionBtnDisabled: {
    opacity: 0.4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0'
  },
  optionText: { 
    fontSize: 15, 
    color: theme.text, 
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  optionTextActive: { 
    color: '#FFFFFF', 
    fontWeight: '800'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  recurrenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    justifyContent: 'flex-end',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  recurrenceOptions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recurrenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recurrenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  recurrenceOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recurrenceOptionDesc: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: theme.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 36,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  chatButton: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFAF0',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: isDark ? '#000' : '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#F5DEB3'
  },
  chatButtonText: {
    color: theme.primary,
    fontSize: 17,
    fontWeight: '600'
  },
  webDateInputContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  webDateInput: {
    fontSize: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.primary,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  // Nuevos estilos para secciones
  section: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
  },
  sectionHeaderSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(159, 34, 65, 0.08)',
  },
  sectionTitleSimple: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  advancedToggle: {
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  advancedToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advancedToggleText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  advancedToggleHint: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 34,
    fontStyle: 'italic',
  },
  advancedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pomodoroModal: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16
  },
  pomodoroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  pomodoroTitle: {
    fontSize: 24,
    fontWeight: '800'
  },
  pomodoroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  // Nuevos estilos para Asignación y Área
  areaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  areaCard: {
    flex: 1,
    minWidth: '45%',
    flexBasis: '45%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(159, 34, 65, 0.05)',
    borderWidth: 2.5,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(159, 34, 65, 0.15)',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    transition: 'all 0.2s ease',
  },
  areaCardActive: {
    borderWidth: 2.5,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  areaIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  userList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  userListItemActive: {
    borderWidth: 1.5,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(159, 34, 65, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(159, 34, 65, 0.4)',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.primary,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  assigneeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  assigneeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  assigneeSelectorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(159, 34, 65, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(159, 34, 65, 0.4)',
  },
  assigneeSelectorInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.primary,
  },
  assigneeSelectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assigneeSelectorValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  // Estilos para el botón de fecha
  datePickerButton: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    justifyContent: 'center',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerInfo: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  datePickerValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  datePickerTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerTimeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Estilos del modal de fecha
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dateModalContent: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 0,
  },
  dateModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dateModalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  dateCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexWrap: 'wrap',
  },
  quickSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateModalBody: {
    paddingHorizontal: 24,
    paddingVertical: 4,
    paddingBottom: 20,
    gap: 20,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  datePickerSection: {
    gap: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  datePreviewText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  datePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  datePreviewIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePreviewCardDate: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePreviewCardValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  datePreviewCardTime: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  dateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  dateModalButton: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalButtonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Estilos para el botón de área modal
  areaButton: {
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 88,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    transition: 'all 0.2s ease',
  },
  areaButtonIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  areaButtonInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  areaButtonLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  areaButtonValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  areaButtonChevron: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  // Estilos para el listado de áreas mejorado
  areaListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  areaListItemActive: {
    borderRadius: 12,
  },
  areaListIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  areaListName: {
    fontSize: 15,
    fontWeight: '600',
  },
  areaTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  areaTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Estilos para pills de áreas seleccionadas
  selectedAreasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
    paddingVertical: 4,
  },
  // Hint de áreas filtradas por usuario
  areaHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
  },
  areaHintText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  areaPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  areaPillRemove: {
    padding: 4,
    marginLeft: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  // Estilos para modal de solo lectura
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  readOnlyModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 50,
  },
  readOnlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  readOnlyTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  readOnlyCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flex: 1,
  },
  readOnlySection: {
    marginBottom: 24,
  },
  readOnlyLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnlyField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 50,
    justifyContent: 'center',
  },
  readOnlyFieldLarge: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
    justifyContent: 'flex-start',
  },
  readOnlyFieldText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  readOnlyActionButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  readOnlyActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  readOnlyCloseButtonBottom: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  readOnlyCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Estilos para botón de delegación
  delegateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  delegateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Estilos para modal de delegación
  delegateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  delegateModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  delegateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  delegateModalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  delegateModalSubtitle: {
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  delegateWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  delegateWarningText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  delegateUsersList: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  noDelegateUsers: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDelegateUsersText: {
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
  },
  delegateUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  delegateUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delegateUserInfo: {
    flex: 1,
    marginLeft: 14,
  },
  delegateUserName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  delegateUserArea: {
    fontSize: 13,
  },
  delegateCancelButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  delegateCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para banner de permisos
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  permissionBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  permissionBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Estilos para modal de confirmación de cambios en asignados
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  confirmModalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  confirmModalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderRadius: 8,
  },
  changeEmail: {
    fontSize: 14,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // ─── IA Feature styles ───────────────────────────────────────────────────────
  aiWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    marginTop: 6,
  },
  aiWarningTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  aiWarningItem: {
    fontSize: 12,
    lineHeight: 17,
  },
  aiSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    marginTop: 2,
  },
  aiApplyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    alignSelf: 'center',
  },
  aiSubtasksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  aiSubtasksBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  aiPendingChips: {
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  aiPendingLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiPendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  aiSubtasksModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  aiSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  aiSubtaskCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiSubtasksCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSubtasksConfirm: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 13,
  },
});
