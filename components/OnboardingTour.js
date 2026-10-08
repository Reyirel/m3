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
import { DURATION, spring, timing } from '../theme/motion';

// Al cambiar la clave, el tutorial se muestra una vez más a quien ya lo había visto.
// v6: Inicio como resumen, Bandeja como lista de trabajo, Reportes en pestañas y sugerencias.
const ONBOARDING_KEY = '@onboarding_v6';
Dimensions.get('window');

// ─── Pasos por rol ────────────────────────────────────────────────────────────

// Pasos comunes a los tres roles
const STEP_HOME = {
  id: 'home',
  title: 'Inicio: lo que pide atención',
  description: 'Arriba hay cuatro recuadros: Vencidas, Hoy, Revisión y Proceso. Toca uno para ver solo esas tareas y tócalo otra vez para volver al resumen. Debajo aparecen las vencidas, las que vencen hoy y las de los próximos 7 días.',
  icon: 'home-outline',
  color: '#9F2241',
};

const STEP_INBOX = {
  id: 'inbox',
  title: 'Bandeja: tu lista de trabajo',
  description: 'Aquí están todas tus tareas con sus acciones: iniciar, enviar a revisión y abrir el chat. Usa el buscador y el botón de filtros para encontrar una tarea; el aviso rojo de cada tarjeta dice hace cuánto venció.',
  icon: 'file-tray-full-outline',
  color: '#3B82F6',
};

const STEP_BOARD = {
  id: 'board',
  title: 'Tablero y Calendario',
  description: 'El Tablero ordena las tareas en columnas: Pendiente, En proceso, En revisión y Cerrada. El Calendario las muestra por día; toca un día para ver sus tareas.',
  icon: 'grid-outline',
  color: '#10B981',
};

const STEP_NOTIFICATIONS = {
  id: 'notifications',
  title: 'Notificaciones',
  description: 'La campana del encabezado muestra cuántos avisos tienes sin leer: tareas asignadas, reportes nuevos y mensajes del chat. Al tocar un aviso se abre la tarea.',
  icon: 'notifications-outline',
  color: '#FF9500',
};

const STEP_OFFLINE = {
  id: 'offline',
  title: 'Sin conexión y modo oscuro',
  description: 'Si te quedas sin internet la app sigue abriendo y guarda tus cambios para enviarlos al volver la red. El botón de luna o sol del encabezado cambia entre tema claro y oscuro. Este tutorial se puede volver a ver cuando quieras desde el menú, en "Tutorial".',
  icon: 'cloud-offline-outline',
  color: '#6366F1',
};

const STEPS_ADMIN = [
  {
    id: 'welcome',
    title: 'Sistema de Gestión Municipal',
    description: 'Como administrador ves todas las tareas de todas las áreas. Este recorrido muestra en un minuto dónde está cada cosa.',
    icon: 'sparkles-outline',
    color: '#9F2241',
  },
  STEP_HOME,
  STEP_INBOX,
  {
    id: 'create_task',
    title: 'Crear una tarea',
    description: 'Usa el botón "+" de Inicio o de la Bandeja. Mientras escribes el título aparecen sugerencias de prioridad, fecha límite y área según tareas anteriores, y un aviso si ya existe una tarea parecida. "Sugerir subtareas" propone los pasos habituales.',
    icon: 'add-circle-outline',
    color: '#8B5CF6',
  },
  STEP_BOARD,
  {
    id: 'reports',
    title: 'Reportes y Panel ejecutivo',
    description: 'En "Más" → Reportes hay tres pestañas: Indicadores (con las áreas que requieren atención), Reportes de las áreas y Analíticas. El Panel ejecutivo resume el avance y el cumplimiento de todas las áreas.',
    icon: 'bar-chart-outline',
    color: '#F59E0B',
  },
  {
    id: 'admin',
    title: 'Administración',
    description: 'En "Más" → Administración das de alta usuarios, restableces contraseñas y editas el organigrama de secretarías y direcciones. La Papelera guarda las tareas eliminadas por si hay que recuperarlas.',
    icon: 'people-outline',
    color: '#6366F1',
  },
  STEP_NOTIFICATIONS,
  STEP_OFFLINE,
];

const STEPS_SECRETARIO = [
  {
    id: 'welcome',
    title: 'Sistema de Gestión Municipal',
    description: 'Como secretario ves las tareas de tu secretaría y de sus direcciones. Este recorrido muestra en un minuto dónde está cada cosa.',
    icon: 'sparkles-outline',
    color: '#9F2241',
  },
  STEP_HOME,
  STEP_INBOX,
  {
    id: 'delegation',
    title: 'Delegar a tus directores',
    description: 'Abre una tarea y pulsa "Delegar Tarea". Solo aparecen los directores de tus direcciones. Cuando todos los asignados confirman su avance, la tarea pasa sola a En revisión.',
    icon: 'people-outline',
    color: '#10B981',
  },
  STEP_BOARD,
  {
    id: 'reports',
    title: 'Reportes y Panel de tu secretaría',
    description: 'En "Más" → Reportes ves los indicadores y los reportes con fotos que envían tus áreas. El Panel de mi secretaría muestra el avance de cada dirección: completadas, pendientes y vencidas.',
    icon: 'bar-chart-outline',
    color: '#F59E0B',
  },
  STEP_NOTIFICATIONS,
  STEP_OFFLINE,
];

const STEPS_DIRECTOR = [
  {
    id: 'welcome',
    title: 'Sistema de Gestión Municipal',
    description: 'Como director ves las tareas de tu área y las que tienes asignadas. Este recorrido muestra en un minuto dónde está cada cosa.',
    icon: 'sparkles-outline',
    color: '#9F2241',
  },
  STEP_HOME,
  STEP_INBOX,
  {
    id: 'status',
    title: 'Avanzar una tarea',
    description: 'Desde la Bandeja pulsa "Iniciar" cuando empieces y "Revisión" cuando termines. Dentro de la tarea, "Confirmar mi avance" le avisa a tu secretario que tu parte está lista.',
    icon: 'play-circle-outline',
    color: '#10B981',
  },
  {
    id: 'reports',
    title: 'Enviar reportes con fotos',
    description: 'En la tarea abre "Reportes" para documentar el avance con texto y fotos. Si no hay internet, el reporte se guarda y se envía solo al reconectarte.',
    icon: 'camera-outline',
    color: '#F59E0B',
  },
  {
    id: 'risk',
    title: 'Aviso de riesgo de retraso',
    description: 'Algunas tarjetas de la Bandeja muestran "Riesgo alto" o "Riesgo medio". Se calcula con la fecha límite, el estado de la tarea y la carga del área, para que sepas cuál atender primero.',
    icon: 'warning-outline',
    color: '#EF4444',
  },
  STEP_BOARD,
  STEP_NOTIFICATIONS,
  STEP_OFFLINE,
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
      timing(fadeAnim, 1, { duration: DURATION.slow }),
      spring(slideAnim, 0),
      spring(scaleAnim, 1),
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
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundTertiary }]}>
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
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ir al paso ${i + 1}`} key={i} onPress={() => setCurrentStep(i)}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === currentStep ? step.color : theme.borderLight,
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
    fontSize: 14,
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
    fontSize: 16,
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
    borderRadius: 16,
  },
  btnPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 2,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
