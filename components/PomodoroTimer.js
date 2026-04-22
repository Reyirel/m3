// components/PomodoroTimer.js
// Temporizador Pomodoro con visualización circular
import React, { useState, useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticMedium, hapticSuccess } from '../utils/haptics';
import CircularProgress from './CircularProgress';

const PomodoroTimer = memo(function PomodoroTimer({ 
  initialMinutes = 25,
  taskId,
  taskTitle,
  onSessionComplete,
  onSessionStart,
  style
}) {
  const { theme, isDark } = useTheme();
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState('focus'); // focus, shortBreak, longBreak
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const durations = {
    focus: 25,
    shortBreak: 5,
    longBreak: 15
  };
  
  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            handleSessionEnd();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isPaused, minutes, seconds]);
  
  const handleSessionEnd = () => {
    hapticSuccess();
    setIsActive(false);
    
    // Animación de finalización
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      })
    ]).start();
    
    // Guardar sesión
    if (sessionType === 'focus') {
      const sessionData = {
        taskId,
        taskTitle,
        duration: durations[sessionType],
        completed: true,
        startedAt: startTimeRef.current,
        completedAt: Date.now(),
        userEmail: '', // Se llenará desde el componente padre
        sessionType
      };
      
      onSessionComplete && onSessionComplete(sessionData);
      
      setSessionsCompleted(sessionsCompleted + 1);
      
      // Sugerir descanso
      if (sessionsCompleted > 0 && (sessionsCompleted + 1) % 4 === 0) {
        setSessionType('longBreak');
        setMinutes(durations.longBreak);
      } else {
        setSessionType('shortBreak');
        setMinutes(durations.shortBreak);
      }
    } else {
      // Volver a focus después del descanso
      setSessionType('focus');
      setMinutes(durations.focus);
    }
    
    setSeconds(0);
  };
  
  const startTimer = () => {
    hapticMedium();
    setIsActive(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    onSessionStart && onSessionStart();
  };
  
  const pauseTimer = () => {
    hapticMedium();
    setIsPaused(!isPaused);
  };
  
  const resetTimer = () => {
    hapticMedium();
    setIsActive(false);
    setIsPaused(false);
    setMinutes(durations[sessionType]);
    setSeconds(0);
  };
  
  const skipSession = () => {
    hapticMedium();
    handleSessionEnd();
  };
  
  const totalSeconds = durations[sessionType] * 60;
  const remainingSeconds = minutes * 60 + seconds;
  const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
  
  const formatTime = (m, s) => {
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  
  const getSessionColor = () => {
    switch (sessionType) {
      case 'focus':
        return theme.error;
      case 'shortBreak':
        return theme.success;
      case 'longBreak':
        return theme.info;
      default:
        return theme.primary;
    }
  };
  
  const getSessionLabel = () => {
    switch (sessionType) {
      case 'focus':
        return '🎯 Enfoque';
      case 'shortBreak':
        return '☕ Descanso Corto';
      case 'longBreak':
        return '🌟 Descanso Largo';
      default:
        return 'Pomodoro';
    }
  };
  
  return (
    <Animated.View style={[styles.container, style, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.card, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        {/* Tipo de sesión */}
        <View style={styles.header}>
          <Text style={[styles.sessionType, { color: getSessionColor() }]}>
            {getSessionLabel()}
          </Text>
          <Text style={[styles.sessionCount, { color: theme.textSecondary }]}>
            Sesión {sessionsCompleted + 1}
          </Text>
        </View>
        
        {/* Timer circular */}
        <View style={styles.timerContainer}>
          <CircularProgress
            size={200}
            progress={progress}
            strokeWidth={12}
            color={getSessionColor()}
            backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6'}
          />
          <View style={styles.timeDisplay}>
            <Text style={[styles.timeText, { color: theme.text }]}>
              {formatTime(minutes, seconds)}
            </Text>
            <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>
              {isActive ? (isPaused ? 'Pausado' : 'En progreso') : 'Listo'}
            </Text>
          </View>
        </View>
        
        {/* Controles */}
        <View style={styles.controls}>
          {!isActive ? (
            <TouchableOpacity
              style={[styles.button, styles.startButton, { backgroundColor: getSessionColor() }]}
              onPress={startTimer}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={24} color="#FFF" />
              <Text style={styles.buttonText}>Iniciar</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.buttonSecondaryBg }]}
                onPress={pauseTimer}
                activeOpacity={0.8}
              >
                <Ionicons name={isPaused ? "play" : "pause"} size={20} color={theme.buttonSecondaryText} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.buttonSecondaryBg }]}
                onPress={resetTimer}
                activeOpacity={0.8}
              >
                <Ionicons name="reload" size={20} color={theme.buttonSecondaryText} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.buttonSecondaryBg }]}
                onPress={skipSession}
                activeOpacity={0.8}
              >
                <Ionicons name="play-skip-forward" size={20} color={theme.buttonSecondaryText} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sessionType: {
    fontSize: 18,
    fontWeight: '700',
  },
  sessionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timeDisplay: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    minWidth: 48,
  },
  startButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default PomodoroTimer;
