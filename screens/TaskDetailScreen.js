/**
 * screens/TaskDetailScreen.js
 *
 * Formulario para crear o editar una tarea. Las secciones viven en components/task
 * y components/selectors; aquí se guarda el estado del formulario y se valida.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';
import PrimaryButton from '../components/ui/PrimaryButton';

// Importar componentes refactorizados
import {
  TaskHeader,
  TaskFormBasic,
  TaskAdvancedOptions,
  TaskAISuggestions,
  TaskSubtasksSection,
  ReadOnlyTaskModal,
  DelegateTaskModal,
} from '../components/task';

// Importar selectores avanzados
import { PrioritySelector, StatusSelector, AreaSelector, DateSelector } from '../components';

// Importar hooks
import useTaskPermissions from '../hooks/useTaskPermissions';
import useTaskOperations from '../hooks/useTaskOperations';
import { confirmAlert, showDialog } from '../utils/alert';

// Importar servicios y utilidades
import { toMs } from '../utils/dateUtils';
import { getSecretariasForAreas } from '../config/areas';
import { getTitularesByAreas, isDirectorOfSecretario, isTitularOfArea } from '../services/roles';
import { canChangeTaskStatus } from '../services/permissions';
import { updateTask } from '../services/tasks';
import { getAssignedEmails } from '../utils/taskHelpers';
import { getTaskAreas } from '../utils/taskVisibility';
import {
  findSimilarTasks,
  suggestPriority,
  suggestDueDate,
  suggestTaskMetadata,
} from '../utils/aiFeatures';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVE_OPACITY, timing } from '../theme/motion';
import { styles } from './task/TaskDetailScreenStyles';

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

export default function TaskDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useNotification();
  const { currentUser, tasks } = useTasks();

  // Task a editar o null para crear nueva
  const editingTask = route.params?.task || null;
  const isEditing = !!editingTask;
  // Versión en tiempo real de la tarea: la que llegó por navegación es una copia y no
  // refleja confirmaciones, delegaciones ni cambios de estado hechos después de abrirla
  const liveTask = useMemo(
    () => (editingTask ? tasks.find(t => t.id === editingTask.id) || editingTask : null),
    [tasks, editingTask]
  );

  // Permisos (usando hook)
  const permissions = useTaskPermissions(editingTask, currentUser);

  // Operaciones (usando hook)
  const taskOps = useTaskOperations(editingTask, currentUser);

  // ────────────────────────────────────────────────────────────
  // FORM STATE
  // ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [priority, setPriority] = useState(editingTask?.priority || 'media');
  const [status, setStatus] = useState(editingTask?.status || 'pendiente');

  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  };
  const [dueAt, setDueAt] = useState(
    editingTask ? new Date(toMs(editingTask.dueAt)) : getDefaultDate()
  );

  // ────────────────────────────────────────────────────────────
  // ASSIGNEES & AREAS STATE
  // ────────────────────────────────────────────────────────────
  const [availableUsers, setAvailableUsers] = useState([]);
  const [titulares, setTitulares] = useState([]);
  // La tarea se asigna por área: reciben la tarea los responsables de las áreas elegidas,
  // menos los que el administrador desmarque (guardados aquí por correo).
  const [excludedEmails, setExcludedEmails] = useState([]);
  const titularesLoadedRef = useRef(false);
  const [selectedAreas, setSelectedAreas] = useState(
    editingTask?.areas && Array.isArray(editingTask.areas)
      ? editingTask.areas
      : editingTask?.area
      ? [editingTask.area]
      : []
  );

  // ────────────────────────────────────────────────────────────
  // ADVANCED OPTIONS STATE
  // ────────────────────────────────────────────────────────────
  const [isRecurring, setIsRecurring] = useState(
    editingTask?.isRecurring || false
  );
  const [recurrencePattern, setRecurrencePattern] = useState(
    editingTask?.recurrencePattern || 'daily'
  );
  const [tags, setTags] = useState(editingTask?.tags || []);
  const [notifyBefore, setNotifyBefore] = useState(editingTask?.notifyBefore || 0);

  // ────────────────────────────────────────────────────────────
  // MODAL STATES
  // ────────────────────────────────────────────────────────────
  const [showDelegateModal, setShowDelegateModal] = useState(false);

  // ────────────────────────────────────────────────────────────
  // AI SUGGESTIONS STATE
  // ────────────────────────────────────────────────────────────
  const [similarTasks, setSimilarTasks] = useState([]);
  const [prioritySuggestion, setPrioritySuggestion] = useState(null);
  const [dateSuggestion, setDateSuggestion] = useState(null);
  const [areaSuggestion, setAreaSuggestion] = useState(null);
  // Subtareas sugeridas que se crearán al guardar una tarea nueva
  const [pendingSubtasks, setPendingSubtasks] = useState([]);
  const aiDebounceRef = useRef(null);

  // ────────────────────────────────────────────────────────────
  // OTHER STATE
  // ────────────────────────────────────────────────────────────
  const [delegateUsers, setDelegateUsers] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  // Errores de validación, junto al campo que los causa
  const [errors, setErrors] = useState({});

  // ────────────────────────────────────────────────────────────
  // CAMBIOS SIN GUARDAR
  // ────────────────────────────────────────────────────────────
  // Se compara todo el formulario con su estado al abrir (no solo título y descripción).
  // Los responsables cuentan solo si el usuario los marcó o desmarcó: al abrir una
  // tarea se ajustan solos mientras cargan.
  const formSnapshot = JSON.stringify({
    title: title.trim(),
    description: description.trim(),
    priority,
    status,
    dueAt: dueAt.getTime(),
    areas: [...selectedAreas].sort(),
    isRecurring,
    recurrencePattern,
    tags,
    notifyBefore,
  });
  const initialSnapshotRef = useRef(formSnapshot);
  const assigneesTouchedRef = useRef(false);
  const [assigneesTouched, setAssigneesTouched] = useState(false);
  const isDirty = permissions.canEdit && (formSnapshot !== initialSnapshotRef.current || assigneesTouched);
  // true al guardar, eliminar o confirmar que se descartan los cambios
  const leavingRef = useRef(false);

  useEffect(() => {
    // Con cambios sin guardar no se puede salir deslizando (iOS): el gesto no pregunta
    navigation.setOptions({ gestureEnabled: !isDirty });
    if (!isDirty) return undefined;
    // Botón atrás de Android, del navegador o cualquier otra salida
    return navigation.addListener('beforeRemove', (event) => {
      if (leavingRef.current) return;
      event.preventDefault();
      showDialog({
        title: 'Descartar cambios',
        message: 'Hay cambios sin guardar. ¿Deseas salir sin guardarlos?',
        buttons: [
          { text: 'Seguir editando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => { leavingRef.current = true; navigation.dispatch(event.data.action); },
          },
        ],
      });
    });
  }, [navigation, isDirty]);

  // ────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    timing(fadeAnim, 1).start();
  }, [fadeAnim]);

  // Cargar usuarios activos para el selector de asignados
  // Si el usuario es secretario, solo muestra los directores de sus direcciones adscritas
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getAllUsers } = await import('../services/usersDirectory');
        // Misma condición que antes (active == true): los usuarios sin el campo no aparecen
        const activeUsers = (await getAllUsers()).filter(u => u.active === true);
        if (cancelled) return;
        const allUsers = activeUsers.map(u => ({
          id: u.id,
          name: u.displayName || u.email || u.id,
          displayName: u.displayName || u.email || u.id,
          email: u.email || '',
          avatar: u.photoURL || null,
          role: u.role || '',
          area: u.area || '',
          secretaria: u.secretaria || '',
          direcciones: u.direcciones || [],
          areasPermitidas: u.areasPermitidas || [],
        }));

        const userRole = currentUser?.role;
        const directors = allUsers.filter(u => u.role === 'director');

        if (userRole === 'secretario') {
          // Secretario: solo los directores adscritos a su secretaría — SIN fallback a todos
          const ownDirectors = directors.filter(u =>
            u.id !== currentUser?.userId && isDirectorOfSecretario(u, currentUser)
          );
          setAvailableUsers(ownDirectors);
          setDelegateUsers(ownDirectors);
        } else {
          setAvailableUsers(allUsers);
          setDelegateUsers(directors);
        }
      } catch (e) {
        if (__DEV__) console.warn('[TaskDetail] Error cargando usuarios:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Cargar responsables cuando cambian las áreas
  useEffect(() => {
    if (!selectedAreas.length) { setTitulares([]); return; }
    let cancelled = false;
    getTitularesByAreas(selectedAreas)
      .then(result => {
        if (cancelled) return;
        setTitulares(result);
        // Al abrir una tarea existente, los responsables que no estaban asignados
        // empiezan desmarcados: editar el título no debe sumar personas a la tarea.
        if (editingTask && !titularesLoadedRef.current) {
          const alreadyAssigned = getAssignedEmails(editingTask);
          setExcludedEmails(
            result.map(t => normalizeEmail(t.email)).filter(email => email && !alreadyAssigned.includes(email))
          );
        }
        titularesLoadedRef.current = true;
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreas]);

  // Asignados de una tarea existente que no son titulares de sus áreas (p. ej. delegados)
  const extraAssignees = useMemo(() => {
    const titularEmails = new Set(titulares.map(t => normalizeEmail(t.email)));
    return getAssignedEmails(editingTask)
      .filter(email => !titularEmails.has(email))
      .map(email => {
        const user = availableUsers.find(u => normalizeEmail(u.email) === email);
        return { id: `extra-${email}`, email, displayName: user?.displayName || email, area: user?.area || '', extra: true };
      });
  }, [titulares, editingTask, availableUsers]);

  const responsables = useMemo(
    () => [...titulares.filter(t => t.email), ...extraAssignees],
    [titulares, extraAssignees]
  );
  const assignees = useMemo(
    () => responsables.filter(r => !excludedEmails.includes(normalizeEmail(r.email))),
    [responsables, excludedEmails]
  );
  const areasSinResponsable = useMemo(
    () => selectedAreas.filter(area => !titulares.some(t => isTitularOfArea(t, area))),
    [selectedAreas, titulares]
  );

  const toggleResponsable = useCallback((email) => {
    if (!assigneesTouchedRef.current) {
      assigneesTouchedRef.current = true;
      setAssigneesTouched(true);
    }
    const key = normalizeEmail(email);
    setExcludedEmails(current =>
      current.includes(key) ? current.filter(e => e !== key) : [...current, key]
    );
  }, []);

  // ────────────────────────────────────────────────────────────
  // AI ANALYSIS (Debounced)
  // ────────────────────────────────────────────────────────────
  // Solo al crear: en una tarea que ya existe sus datos ya se decidieron
  useEffect(() => {
    if (isEditing || !title || title.length < 6) {
      setSimilarTasks([]);
      setPrioritySuggestion(null);
      setDateSuggestion(null);
      setAreaSuggestion(null);
      return undefined;
    }

    clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(() => {
      setSimilarTasks(findSimilarTasks(title, tasks));
      const priSug = suggestPriority(title, description);
      setPrioritySuggestion(priSug.priority ? priSug : null);
      const dateSug = suggestDueDate(title, selectedAreas[0] || '', tasks);
      setDateSuggestion(dateSug.suggestedDate ? dateSug : null);
      const metaSug = suggestTaskMetadata(title, tasks);
      setAreaSuggestion(metaSug.area ? metaSug : null);
    }, 600);

    return () => clearTimeout(aiDebounceRef.current);
  }, [title, description, tasks, isEditing, selectedAreas]);

  // ────────────────────────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────────────────────────

  // Si hay cambios sin guardar, el aviso lo muestra el listener de `beforeRemove`
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Main');
  }, [navigation]);

  const leave = useCallback(() => {
    leavingRef.current = true;
    handleBack();
  }, [handleBack]);

  const handleDelete = () => {
    if (!permissions.canDelete) return;

    confirmAlert(
      'Eliminar tarea',
      'La tarea se moverá a la papelera, de donde un administrador puede restaurarla.',
      async () => {
        const result = await taskOps.deleteTask(editingTask.id);
        if (result) leave();
      },
      'Eliminar'
    );
  };

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    const check = canChangeTaskStatus(currentUser, liveTask || { id: taskId }, newStatus);
    if (!check.canChange) {
      showError(check.reason);
      return;
    }
    try {
      // updateTask aplica las reglas del servicio (solo el admin cierra) y actualiza
      // el avance de la tarea principal cuando es la subtarea de un área
      await updateTask(taskId, { status: newStatus });
    } catch (e) {
      showError(e?.code === 'permission-denied' ? e.message : 'Error al actualizar el estado');
    }
  }, [currentUser, liveTask, showError]);

  const handleDelegate = useCallback(async (director) => {
    if (!liveTask || !director) return;
    // El secretario solo delega a directores de su secretaría (el admin, a cualquiera)
    if (currentUser?.role === 'secretario' && !isDirectorOfSecretario(director, currentUser)) {
      showError('Solo puedes delegar a directores de tu secretaría');
      return;
    }
    try {
      const directorEmail = (director.email || '').toLowerCase().trim();
      const directorName = director.displayName || director.name || directorEmail;
      const currentAssigned = getAssignedEmails(liveTask);
      const alreadyAssigned = currentAssigned.includes(directorEmail);
      const newAssigned = alreadyAssigned ? currentAssigned : [...currentAssigned, directorEmail];

      // Nombres y estado por asignado se reconstruyen por correo para que no se desordenen
      const previousAssignments = Array.isArray(liveTask.assignments) ? liveTask.assignments : [];
      const assignments = newAssigned.map(email =>
        previousAssignments.find(a => (a.email || '').toLowerCase().trim() === email) || {
          email,
          name: email === directorEmail ? directorName : email,
          status: 'pendiente',
          completedAt: null,
        }
      );

      const updates = {
        assignedTo: newAssigned,
        assignedToNames: assignments.map(a => a.name || a.email),
        assignments,
        // La secretaría del director delegado también debe poder ver la tarea
        secretarias: [...new Set([
          ...(liveTask.secretarias || []),
          ...getSecretariasForAreas([...getTaskAreas(liveTask), director.secretaria || director.area]),
        ])],
        delegatedTo: directorEmail,
        delegatedBy: currentUser?.email || '',
        delegatedAt: new Date().toISOString(),
      };
      // Si la tarea ya estaba en revisión porque todos habían confirmado, el nuevo
      // asignado aún no confirma: regresa a en proceso
      if (!alreadyAssigned && liveTask.status === 'en_revision') {
        updates.status = 'en_proceso';
      }

      // updateTask funciona también sin conexión: guarda el cambio en la cola
      await updateTask(liveTask.id, updates);
      showSuccess(`Tarea delegada a ${directorName}`);
      setShowDelegateModal(false);
    } catch {
      showError('Error al delegar la tarea');
    }
  }, [liveTask, currentUser, showSuccess, showError]);

  const handleSave = async () => {
    if (taskOps.isSaving) return;

    // Validaciones: cada error se muestra junto a su campo
    const found = {};
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle) found.title = 'El título es obligatorio';
    else if (cleanTitle.length < 3) found.title = 'El título debe tener al menos 3 caracteres';
    if (!cleanDescription) found.description = 'La descripción es obligatoria';
    else if (cleanDescription.length < 10) found.description = 'La descripción debe tener al menos 10 caracteres';
    if (selectedAreas.length === 0) found.areas = 'Selecciona al menos un área';
    else if (assignees.length === 0) {
      found.assignees = responsables.length === 0
        ? 'Las áreas elegidas no tienen responsable con cuenta activa: nadie recibiría la tarea'
        : 'Marca al menos a un responsable para que reciba la tarea';
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showError('Revisa los campos marcados');
      // Título y descripción están arriba; las áreas y responsables, más abajo
      if (found.title || found.description) scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    // Guardar
    const result = await taskOps.save({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueAt,
      selectedAssignees: assignees.map(a => ({ email: normalizeEmail(a.email) })),
      selectedAreas,
      isRecurring,
      recurrencePattern,
      tags,
      notifyBefore,
      aiPendingSubtasks: pendingSubtasks,
    });

    if (result) leave();
  };

  // Al corregir un campo se quita su error
  const clearError = (key) => setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));

  // Mostrar modal de solo lectura si es read-only
  if (permissions.isReadOnly && editingTask) {
    return (
      <>
        <ReadOnlyTaskModal
          task={liveTask}
          navigation={navigation}
          theme={theme}
          canAddSubtask={permissions.canAddSubtask}
          canDelegate={permissions.canDelegate}
          delegateUsers={delegateUsers}
          currentUser={currentUser}
          onStatusChange={handleStatusChange}
          onOpenDelegate={() => setShowDelegateModal(true)}
        />
        <DelegateTaskModal
          visible={showDelegateModal}
          onClose={() => setShowDelegateModal(false)}
          delegateUsers={delegateUsers}
          task={editingTask}
          currentUser={currentUser}
          theme={theme}
          onDelegate={handleDelegate}
        />
      </>
    );
  }

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <TaskHeader
          isEditing={isEditing}
          canDelete={permissions.canDelete}
          onClose={handleBack}
          onDelete={handleDelete}
        />

        {/* CONTENT */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* FORM BASIC */}
            <TaskFormBasic
              title={title}
              onTitleChange={(text) => { setTitle(text); clearError('title'); }}
              description={description}
              onDescriptionChange={(text) => { setDescription(text); clearError('description'); }}
              isReadOnly={!permissions.canEdit}
              errors={errors}
            />

            {/* ENHANCED SELECTORS - PRIORITY */}
            {permissions.canEdit && (
              <PrioritySelector
                value={priority}
                onChange={setPriority}
              />
            )}

            {/* ENHANCED SELECTORS - STATUS */}
            {permissions.canEdit && (
              <StatusSelector
                value={status}
                onChange={setStatus}
              />
            )}

            {/* ENHANCED SELECTORS - AREAS */}
            {permissions.canEdit && (
              <AreaSelector
                value={selectedAreas}
                onChange={(areas) => { setSelectedAreas(areas); clearError('areas'); clearError('assignees'); }}
                multiple={true}
              />
            )}
            {permissions.canEdit && !!(errors.areas || errors.assignees) && (
              <View style={styles.fieldError} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={16} color={theme.error} />
                <Text style={[styles.fieldErrorText, { color: theme.error }]}>{errors.areas || errors.assignees}</Text>
              </View>
            )}

            {/* RESPONSABLES POR ÁREA — son quienes reciben la tarea.
                No hay selector de personas aparte: la tarea se asigna por área y aquí
                solo se desmarca a quien no deba recibirla. */}
            {permissions.canEdit && responsables.length > 0 && (
              <View style={[styles.titularesCard, { backgroundColor: theme.glassPrimary, borderColor: theme.primary + '30' }]}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="people-circle-outline" size={16} color={theme.primary} />
                  <Text style={[styles.infoCardTitle, { color: theme.primary }]}>
                    Se asignará a ({assignees.length} de {responsables.length})
                  </Text>
                </View>
                {responsables.map(t => {
                  const included = !excludedEmails.includes(normalizeEmail(t.email));
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.titularRow}
                      onPress={() => toggleResponsable(t.email)}
                      activeOpacity={ACTIVE_OPACITY}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: included }}
                      accessibilityLabel={`${t.displayName || t.email}: ${included ? 'recibe la tarea' : 'no recibe la tarea'}`}
                    >
                      <Ionicons
                        name={included ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={included ? theme.primary : theme.textSecondary}
                      />
                      <View style={{ flex: 1, opacity: included ? 1 : 0.5 }}>
                        <Text style={[styles.titularName, { color: theme.text }]}>
                          {t.displayName || t.email || t.id}
                        </Text>
                        <Text style={[styles.titularMeta, { color: theme.textSecondary }]}>
                          {t.extra ? 'Asignado adicional' : (t.role === 'secretario' ? 'Secretario/a' : 'Director/a')}
                          {(t.area || (t.areasPermitidas || [])[0]) ? ` · ${(t.area || (t.areasPermitidas || [])[0]).replace(/^(Secretaría|Dirección)\s+(de\s+|del\s+|General\s+)?/i, '')}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ÁREAS SIN RESPONSABLE: nadie recibiría la tarea por esa área */}
            {permissions.canEdit && areasSinResponsable.length > 0 && (
              <View style={[styles.infoCard, { backgroundColor: theme.warningAlpha, borderColor: theme.warningText + '55' }]}>
                <Ionicons name="warning-outline" size={16} color={theme.warningText} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoCardTitle, { color: theme.warningText }]}>
                    {areasSinResponsable.length === 1 ? 'Área sin responsable' : 'Áreas sin responsable'}
                  </Text>
                  <Text style={[styles.infoCardDesc, { color: theme.textSecondary }]}>
                    {areasSinResponsable.join(', ')} no {areasSinResponsable.length === 1 ? 'tiene' : 'tienen'} una cuenta activa asignada, así que nadie recibirá la tarea por {areasSinResponsable.length === 1 ? 'esa área' : 'esas áreas'}.
                  </Text>
                </View>
              </View>
            )}

            {/* AVISO DE TAREA COORDINADA */}
            {permissions.canEdit && !isEditing && selectedAreas.length > 1 && (
              <View style={[styles.infoCard, { backgroundColor: theme.infoAlpha, borderColor: theme.info + '40' }]}>
                <Ionicons name="git-branch-outline" size={16} color={theme.info} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoCardTitle, { color: theme.info }]}>Tarea coordinada</Text>
                  <Text style={[styles.infoCardDesc, { color: theme.textSecondary }]}>
                    Se creará una subtarea por cada área ({selectedAreas.length} en total). Cada responsable podrá gestionarla de forma independiente.
                  </Text>
                </View>
              </View>
            )}

            {/* ENHANCED SELECTORS - DATE */}
            {permissions.canEdit && (
              <DateSelector
                value={dueAt}
                onChange={setDueAt}
                showTime={true}
              />
            )}

            {/* ADVANCED OPTIONS */}
            <TaskAdvancedOptions
              isRecurring={isRecurring}
              onRecurringChange={setIsRecurring}
              recurrencePattern={recurrencePattern}
              onRecurrencePatternChange={setRecurrencePattern}
              tags={tags}
              onTagsChange={setTags}
              notifyBefore={notifyBefore}
              onNotifyBeforeChange={setNotifyBefore}
              isReadOnly={!permissions.canEdit}
            />

            {/* SUGERENCIAS: solo las que cambiarían algo de lo ya elegido */}
            {!isEditing && (
              <TaskAISuggestions
                suggestions={{
                  priority: prioritySuggestion && prioritySuggestion.priority !== priority ? prioritySuggestion : null,
                  dueDate: dateSuggestion,
                  area: areaSuggestion && !selectedAreas.includes(areaSuggestion.area) ? areaSuggestion : null,
                  similarTasks,
                }}
                onApplyPriority={(value) => { setPriority(value); showSuccess('Prioridad aplicada'); }}
                onApplyDueDate={(date) => { setDueAt(new Date(date)); setDateSuggestion(null); showSuccess('Fecha aplicada'); }}
                onApplyArea={(area) => { setSelectedAreas([area]); showSuccess('Área aplicada'); }}
                onOpenTask={(task) => navigation.push('TaskDetail', { task, taskId: task.id })}
                isReadOnly={!permissions.canEdit}
              />
            )}

            {/* SUBTAREAS SUGERIDAS */}
            <TaskSubtasksSection
              task={editingTask}
              title={title}
              description={description}
              canEdit={permissions.canEdit}
              pendingSubtasks={pendingSubtasks}
              onPendingSubtasksChange={setPendingSubtasks}
            />
          </ScrollView>
        </Animated.View>

        {/* GUARDAR: fijo abajo, a la vista sin tener que recorrer todo el formulario */}
        {permissions.canEdit && (
          <View
            style={[
              styles.saveBar,
              { backgroundColor: theme.card, borderTopColor: theme.glassBorder, paddingBottom: insets.bottom + 12 },
            ]}
          >
            <PrimaryButton
              title={
                taskOps.isSaving
                  ? `Guardando… ${taskOps.saveProgress || 0}%`
                  : isEditing
                  ? 'Guardar cambios'
                  : 'Crear tarea'
              }
              onPress={handleSave}
              loading={taskOps.isSaving}
              icon="checkmark-circle"
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* DELEGATE MODAL */}
      <DelegateTaskModal
        visible={showDelegateModal}
        onClose={() => setShowDelegateModal(false)}
        delegateUsers={delegateUsers}
        task={editingTask}
        currentUser={currentUser}
        theme={theme}
        onDelegate={handleDelegate}
      />

    </View>
  );
}
