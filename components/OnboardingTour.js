// components/OnboardingTour.js
// Tour interactivo de onboarding — muestra pasos según el rol del usuario
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

// v5 key: versión mejorada y pulida — modo oscuro, delegación completa, responsables por área
const ONBOARDING_KEY = '@onboarding_v5';
Dimensions.get('window');

// ─── Pasos por rol ────────────────────────────────────────────────────────────

const STEPS_ADMIN = [
  {
    id: 'welcome',
    title: '¡Bienvenido a la versión mejorada!',
    description: 'Esta es una versión más pulida y estable. Encontrarás el toggle de modo oscuro/claro en el encabezado, navegación más fluida y correcciones en toda la app.',
    icon: 'sparkles-outline',
    color: '#9F2241',
  },
  {
    id: 'stats_strip',
    title: 'Resumen visual interactivo',
    description: 'Los chips de colores bajo el buscador muestran conteos en tiempo real. Toca "Pendientes", "En proceso" o "Cerradas" para filtrar la lista al instante.',
    icon: 'stats-chart-outline',
    color: '#3B82F6',
  },
  {
    id: 'create_task',
    title: 'Crear y Asignar Tareas',
    description: 'Pulsa el botón "+" (esquina inferior derecha) para crear tareas. Asigna responsables, fecha límite y prioridad. La IA sugiere subtareas automáticamente.',
    icon: 'add-circle-outline',
    color: '#8B5CF6',
  },
  {
    id: 'task_cards',
    title: 'Tarjetas con fechas relativas',
    description: 'Cada tarea muestra "Hoy", "Mañana" o "en 3d" en lugar de fechas exactas. La barra de color a la izquierda indica prioridad. Las vencidas se marcan en rojo.',
    icon: 'calendar-outline',
    color: '#EF4444',
  },
  {
    id: 'kanban',
    title: 'Tablero Kanban',
    description: 'Visualiza todas las tareas en columnas: Pendiente → En Progreso → Revisión → Cerrada. Ideal para detectar cuellos de botella de un vistazo.',
    icon: 'grid-outline',
    color: '#10B981',
  },
  {
    id: 'reports',
    title: 'Reportes y Evidencias',
    description: 'Los usuarios suben reportes con fotos y texto. En "Reportes" puedes revisar avances, aprobar/rechazar y exportar a PDF.',
    icon: 'document-text-outline',
    color: '#F59E0B',
  },
  {
    id: 'executive',
    title: 'Dashboard Ejecutivo',
    description: 'El Panel Ejecutivo muestra estadísticas en tiempo real: productividad por área, tareas vencidas, tendencias y comparativos de periodos.',
    icon: 'bar-chart-outline',
    color: '#6366F1',
  },
  {
    id: 'notifications',
    title: 'Notificaciones en tiempo real',
    description: 'La campana en el encabezado muestra cuántas notificaciones tienes sin leer. Tócala para ver asignaciones, cambios de estado y menciones.',
    icon: 'notifications-outline',
    color: '#FF9500',
  },
  {
    id: 'dark_mode',
    title: 'Modo oscuro/claro',
    description: 'El botón de luna/sol en el encabezado cambia el tema al instante. Tu preferencia se guarda automáticamente para la próxima vez.',
    icon: 'moon-outline',
    color: '#6366F1',
  },
  {
    id: 'ready',
    title: '¡Todo listo!',
    description: 'Versión más estable y pulida. Si necesitas ayuda, el ícono "?" en el menú o en cada pantalla te explica qué hace cada sección.',
    icon: 'rocket-outline',
    color: '#10B981',
  },
];

const STEPS_SECRETARIO = [
  {
    id: 'welcome',
    title: '¡Versión mejorada para Secretaría!',
    description: 'El flujo de delegación ahora funciona completamente. Puedes delegar tareas a los directores de tus áreas adscritas y ver quién está a cargo de cada área antes de asignar.',
    icon: 'git-branch-outline',
    color: '#9F2241',
  },
  {
    id: 'my_tasks',
    title: 'Tus Tareas Asignadas',
    description: 'La pantalla principal muestra las tareas asignadas a ti. Los chips de colores (Pendientes, En proceso, Cerradas) son táctiles — tócalos para filtrar al instante.',
    icon: 'checkbox-outline',
    color: '#3B82F6',
  },
  {
    id: 'task_cards',
    title: 'Tarjetas inteligentes',
    description: 'Las tarjetas muestran "Hoy", "Mañana" o "en 3d" para que veas de un vistazo qué vence pronto. Las tareas vencidas se marcan en rojo automáticamente.',
    icon: 'calendar-outline',
    color: '#EF4444',
  },
  {
    id: 'delegation',
    title: 'Delegar a tus Directores',
    description: 'Abre cualquier tarea y pulsa "Delegar Tarea". Solo verás los directores de tus áreas adscritas. Al seleccionar un área en el formulario, la app muestra automáticamente quién está a cargo.',
    icon: 'people-outline',
    color: '#10B981',
  },
  {
    id: 'monitor',
    title: 'Monitorear Directores',
    description: 'Desde el Dashboard de Secretaría ves el avance de todos los directores: tareas completadas, pendientes y vencidas desglosadas por área.',
    icon: 'eye-outline',
    color: '#8B5CF6',
  },
  {
    id: 'reports',
    title: 'Reportes con Evidencias',
    description: 'Documenta avances con fotos y texto. Los reportes funcionan sin conexión y se sincronizan automáticamente al reconectarte.',
    icon: 'camera-outline',
    color: '#F59E0B',
  },
  {
    id: 'ai_subtasks',
    title: 'IA: Genera subtareas al instante',
    description: 'Al crear o editar una tarea, el botón "Sugerir subtareas con IA" analiza el título y propone los pasos. Selecciona los que necesites y se crean solos.',
    icon: 'sparkles-outline',
    color: '#6366F1',
  },
  {
    id: 'dark_mode',
    title: 'Modo oscuro/claro',
    description: 'Toca el ícono de luna o sol en el encabezado para cambiar el tema. Tu preferencia queda guardada.',
    icon: 'moon-outline',
    color: '#6366F1',
  },
  {
    id: 'ready',
    title: '¡Listo para coordinar!',
    description: 'Versión más estable y completa. Toca "?" en cualquier pantalla para ver una guía rápida de esa sección.',
    icon: 'checkmark-circle-outline',
    color: '#10B981',
  },
];

const STEPS_DIRECTOR = [
  {
    id: 'welcome',
    title: '¡Versión mejorada, Director/a!',
    description: 'Ahora puedes confirmar tu avance directamente desde cada tarea con el botón "Confirmar mi avance". Tu secretario verá el progreso en tiempo real.',
    icon: 'checkmark-done-circle-outline',
    color: '#9F2241',
  },
  {
    id: 'my_tasks',
    title: 'Mis Tareas',
    description: 'Ves solo las tareas de tu área o asignadas a ti. Los chips "Pendientes", "En proceso" y "Cerradas" filtran la lista con un solo toque.',
    icon: 'list-outline',
    color: '#3B82F6',
  },
  {
    id: 'task_cards',
    title: 'Fechas que se entienden',
    description: 'Las tarjetas muestran "Hoy", "Mañana" o "en 3d" en lugar de fechas. La barra de color a la izquierda indica la prioridad. Si vence, se pone roja.',
    icon: 'calendar-outline',
    color: '#EF4444',
  },
  {
    id: 'status',
    title: 'Actualizar Estado y Confirmar Avance',
    description: 'Cambia el estado a "En Progreso" o "En Revisión" para que tu secretario sepa dónde estás. Cuando termines, pulsa "Confirmar mi avance" — el sistema notificará al equipo.',
    icon: 'refresh-circle-outline',
    color: '#10B981',
  },
  {
    id: 'reports',
    title: 'Subir Reportes',
    description: 'Adjunta fotos de evidencia y texto en la sección "Reportes". Funciona sin internet y sube solo al reconectarte.',
    icon: 'cloud-upload-outline',
    color: '#F59E0B',
  },
  {
    id: 'notifications',
    title: 'Notificaciones',
    description: 'El badge rojo en la campana te avisa de asignaciones nuevas y mensajes. Toca la campana para ver todo sin perder nada.',
    icon: 'notifications-outline',
    color: '#FF9500',
  },
  {
    id: 'ai_risk',
    title: 'IA: Alerta de riesgo',
    description: 'Cada tarea muestra si tiene riesgo alto o medio de retrasarse, calculado automáticamente. Sin configurar nada.',
    icon: 'warning-outline',
    color: '#F59E0B',
  },
  {
    id: 'dark_mode',
    title: 'Modo oscuro/claro',
    description: 'Toca el ícono de luna o sol en el encabezado para cambiar el tema según tus preferencias.',
    icon: 'moon-outline',
    color: '#6366F1',
  },
  {
    id: 'ready',
    title: '¡Todo en orden!',
    description: 'Versión más estable y pulida. El ícono "?" en cada pantalla te muestra una guía rápida de esa sección.',
    icon: 'checkmark-done-circle-outline',
    color: '#10B981',
  },
];

const _DEFAULT_STEPS = STEPS_ADMIN;

function getStepsForRole(role) {
  if (role === 'secretario') return STEPS_SECRETARIO;
  if (role === 'director') return STEPS_DIRECTOR;
  return STEPS_ADMIN; // admin or fallback
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * OnboardingTour
 * @param {string}   userRole  - 'admin' | 'secretario' | 'director'
 * @param {Function} onComplete
 * @param {boolean}  forceShow - Mostrar aunque ya se haya visto
 */
export default function OnboardingTour({ userRole, onComplete, forceShow = false }) {
  const { theme, isDark } = useTheme();
  const steps = getStepsForRole(userRole);

  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        if (forceShow) {
          if (mounted) setVisible(true);
          return;
        }
        const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!completed && mounted) setVisible(true);
      } catch (_) {
        // silent — don't block the app
      }
    };
    check();
    return () => { mounted = false; };
  }, [forceShow]);

  const animateStep = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    scaleAnim.setValue(0.92);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 42, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 42, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  useEffect(() => {
    if (visible) animateStep();
  }, [currentStep, visible, animateStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
    else handleComplete();
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (_) { /* intencional */ }
    setVisible(false);
    onComplete?.();
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: step.color }]} />
          </View>

          {/* Step counter + skip */}
          <View style={styles.topRow}>
            <Text style={[styles.stepCounter, { color: theme.textSecondary }]}>
              {currentStep + 1} / {steps.length}
            </Text>
            {!isLast && (
              <TouchableOpacity onPress={handleComplete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.skipText, { color: theme.textSecondary }]}>Saltar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: `${step.color}1A` }]}>
            <Ionicons name={step.icon} size={52} color={step.color} />
          </View>

          {/* Content */}
          <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{step.description}</Text>

          {/* Dot indicators */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setCurrentStep(i)}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === currentStep ? step.color : isDark ? '#3A3A3C' : '#E5E7EB',
                      width: i === currentStep ? 22 : 8,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            {!isFirst && (
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: step.color }]}
                onPress={handlePrevious}
              >
                <Ionicons name="arrow-back" size={18} color={step.color} />
                <Text style={[styles.btnSecondaryText, { color: step.color }]}>Anterior</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: step.color, flex: isFirst ? 1 : undefined }]}
              onPress={handleNext}
            >
              <Text style={styles.btnPrimaryText}>{isLast ? '¡Empezar!' : 'Siguiente'}</Text>
              <Ionicons name={isLast ? 'rocket' : 'arrow-forward'} size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Utilidades exportadas ────────────────────────────────────────────────────

export async function resetOnboarding() {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

export async function hasCompletedOnboarding() {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return !!val;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28, shadowRadius: 22 },
      android: { elevation: 22 },
    }),
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    marginBottom: 8,
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: '600',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  btnPrimaryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 2,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
