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

// v3 key: force re-show for all users (new AI features added)
const ONBOARDING_KEY = '@onboarding_v3';
Dimensions.get('window');

// ─── Pasos por rol ────────────────────────────────────────────────────────────

const STEPS_ADMIN = [
  {
    id: 'welcome',
    title: '¡Bienvenido, Administrador!',
    description: 'Tienes acceso completo al sistema. Te mostramos las herramientas más importantes en un momento.',
    icon: 'shield-checkmark-outline',
    color: '#9F2241',
  },
  {
    id: 'create_task',
    title: 'Crear y Asignar Tareas',
    description: 'Desde la pantalla principal pulsa el botón "+" para crear tareas. Puedes asignar responsables, establecer fecha límite y prioridad.',
    icon: 'add-circle-outline',
    color: '#3B82F6',
  },
  {
    id: 'areas',
    title: 'Gestión por Áreas',
    description: 'Cada tarea pertenece a un área (Turismo, Salud, Educación…). Los secretarios y directores solo ven sus áreas asignadas.',
    icon: 'business-outline',
    color: '#10B981',
  },
  {
    id: 'kanban',
    title: 'Tablero Kanban',
    description: 'Visualiza el estado de todas las tareas en columnas: Pendiente → En Progreso → Revisión → Cerrada. Ideal para ver cuellos de botella.',
    icon: 'grid-outline',
    color: '#8B5CF6',
  },
  {
    id: 'reports',
    title: 'Reportes y Evidencias',
    description: 'Los usuarios suben reportes con fotos y texto. Desde "Reportes" puedes revisar avances, aprobar o rechazar y exportar a PDF.',
    icon: 'document-text-outline',
    color: '#F59E0B',
  },
  {
    id: 'executive',
    title: 'Dashboard Ejecutivo',
    description: 'El Panel Ejecutivo muestra estadísticas en tiempo real: productividad por área, tareas vencidas, tendencias y comparativos.',
    icon: 'stats-chart-outline',
    color: '#EF4444',
  },
  {
    id: 'admin_panel',
    title: 'Panel de Administración',
    description: 'Gestiona usuarios, áreas y permisos desde el Panel Admin. Solo tú puedes crear cuentas de secretario y director.',
    icon: 'settings-outline',
    color: '#6366F1',
  },
  {
    id: 'ai_features',
    title: 'Inteligencia Artificial integrada',
    description: 'El sistema detecta tareas duplicadas, sugiere área y responsable mientras escribes, y genera subtareas automáticamente. Cada tarea muestra también una alerta de riesgo de retraso.',
    icon: 'sparkles-outline',
    color: '#6366F1',
  },
  {
    id: 'ready',
    title: '¡Todo listo!',
    description: 'Tienes el control total. Si necesitas ayuda, el ícono "?" en cada pantalla te explica qué hace cada sección.',
    icon: 'rocket-outline',
    color: '#10B981',
  },
];

const STEPS_SECRETARIO = [
  {
    id: 'welcome',
    title: '¡Bienvenido, Secretario/a!',
    description: 'Tu rol es coordinar y monitorear a los directores de tu área. Te explicamos cómo sacarle el máximo provecho al sistema.',
    icon: 'person-circle-outline',
    color: '#9F2241',
  },
  {
    id: 'my_tasks',
    title: 'Tus Tareas Asignadas',
    description: 'La pantalla principal muestra solo las tareas que el administrador te asignó. Puedes filtrar por estado, área o prioridad.',
    icon: 'checkbox-outline',
    color: '#3B82F6',
  },
  {
    id: 'subtasks',
    title: 'Crear Sub-Tareas',
    description: 'Dentro de una tarea asignada puedes crear sub-tareas y delegar trabajo a directores de tu área. El admin recibirá notificación.',
    icon: 'git-branch-outline',
    color: '#10B981',
  },
  {
    id: 'monitor',
    title: 'Monitorear Directores',
    description: 'Desde el Dashboard de Secretaría ves el avance de todos los directores: tareas completadas, pendientes y vencidas por área.',
    icon: 'eye-outline',
    color: '#8B5CF6',
  },
  {
    id: 'reports',
    title: 'Reportes con Evidencias',
    description: 'Documenta avances con fotos y texto. Los reportes también funcionan sin conexión y se sincronizan al volver a conectarse.',
    icon: 'camera-outline',
    color: '#F59E0B',
  },
  {
    id: 'calendar',
    title: 'Calendario de Vencimientos',
    description: 'El Calendario te muestra todos los días con tareas programadas. Un punto naranja indica vencimiento próximo.',
    icon: 'calendar-outline',
    color: '#EF4444',
  },
  {
    id: 'ai_subtasks',
    title: 'IA: Genera subtareas al instante',
    description: 'Al crear o editar una tarea, el botón "Sugerir subtareas con IA" analiza el título y sugiere los pasos necesarios. Selecciona los que quieras y se crean automáticamente.',
    icon: 'sparkles-outline',
    color: '#6366F1',
  },
  {
    id: 'ready',
    title: '¡Listo para coordinar!',
    description: 'Ya conoces tu flujo de trabajo. Toca el ícono "?" en cualquier pantalla para obtener ayuda contextual.',
    icon: 'checkmark-circle-outline',
    color: '#10B981',
  },
];

const STEPS_DIRECTOR = [
  {
    id: 'welcome',
    title: '¡Bienvenido, Director/a!',
    description: 'Tu pantalla muestra las tareas asignadas a tu área. Puedes actualizar avances y subir reportes con evidencias.',
    icon: 'person-outline',
    color: '#9F2241',
  },
  {
    id: 'my_tasks',
    title: 'Mis Tareas',
    description: 'Aquí verás solo las tareas de tu área o asignadas directamente a ti. Toca una tarea para ver sus detalles completos.',
    icon: 'list-outline',
    color: '#3B82F6',
  },
  {
    id: 'status',
    title: 'Actualizar Estado',
    description: 'Dentro de una tarea puedes cambiar el estado a "En Progreso" o "Revisión" para informar al secretario tu avance.',
    icon: 'refresh-circle-outline',
    color: '#10B981',
  },
  {
    id: 'reports',
    title: 'Subir Reportes',
    description: 'En la pestaña "Reportes" puedes adjuntar fotos de evidencia y agregar descripciones. Funciona sin internet.',
    icon: 'cloud-upload-outline',
    color: '#F59E0B',
  },
  {
    id: 'calendar',
    title: 'Calendario',
    description: 'Revisa las fechas límite en el Calendario. Los días con punto naranja tienen tareas que vencen pronto.',
    icon: 'calendar-outline',
    color: '#8B5CF6',
  },
  {
    id: 'chat',
    title: 'Chat por Tarea',
    description: 'Cada tarea tiene su propio chat. Puedes enviar mensajes, imágenes y actualizaciones directamente a tu secretario.',
    icon: 'chatbubbles-outline',
    color: '#6366F1',
  },
  {
    id: 'ai_risk',
    title: 'IA: Alerta de riesgo de retraso',
    description: 'Cada tarea muestra automáticamente si tiene "Riesgo alto" o "Riesgo medio" de retrasarse, basado en el historial del área y del responsable. Sin hacer nada extra.',
    icon: 'warning-outline',
    color: '#F59E0B',
  },
  {
    id: 'ready',
    title: '¡Todo en orden!',
    description: 'Ya sabes cómo moverte. Si tienes dudas, el ícono "?" en cada pantalla te muestra qué hace cada función.',
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
