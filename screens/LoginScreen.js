// screens/LoginScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
  Linking, ActivityIndicator, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../services/authFirestore';
import Toast from 'react-native-toast-message';

const BRAND = '#9F2241';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos
const ATTEMPTS_KEY = 'login_attempts';
const BRAND_DARK = '#7A1A32';
const BRAND_GLOW = 'rgba(159, 34, 65, 0.35)';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [attempts, setAttempts]         = useState(0);
  const [lockedUntil, setLockedUntil]   = useState(null);
  const [lockTimer, setLockTimer]       = useState('');
  const timerRef = useRef(null);

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(32)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();

    // Restaurar intentos guardados
    AsyncStorage.getItem(ATTEMPTS_KEY).then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.lockedUntil && Date.now() < data.lockedUntil) {
          setAttempts(data.count);
          setLockedUntil(data.lockedUntil);
        } else if (data.lockedUntil && Date.now() >= data.lockedUntil) {
          AsyncStorage.removeItem(ATTEMPTS_KEY);
        } else {
          setAttempts(data.count || 0);
        }
      } catch {}
    });
    return () => clearInterval(timerRef.current);
  }, []);

  // Cuenta regresiva del bloqueo
  useEffect(() => {
    if (!lockedUntil) { setLockTimer(''); return; }
    const update = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setLockTimer('');
        AsyncStorage.removeItem(ATTEMPTS_KEY);
        clearInterval(timerRef.current);
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setLockTimer(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => clearInterval(timerRef.current);
  }, [lockedUntil]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 9,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (lockedUntil && Date.now() < lockedUntil) {
      triggerShake();
      Toast.show({ type: 'error', text1: `Cuenta bloqueada. Espera ${lockTimer}`, position: 'top', visibilityTime: 3000 });
      return;
    }
    if (!email.trim() || !password.trim()) {
      triggerShake();
      Toast.show({ type: 'error', text1: 'Completa todos los campos', position: 'top', visibilityTime: 2500 });
      return;
    }
    setLoading(true);
    try {
      const result = await loginUser(email.trim().toLowerCase(), password);
      if (result.success) {
        await AsyncStorage.removeItem(ATTEMPTS_KEY);
        setAttempts(0);
        Toast.show({ type: 'success', text1: 'Bienvenido', position: 'bottom', visibilityTime: 1500 });
        setTimeout(() => { if (onLogin) onLogin(); }, 600);
      } else {
        triggerShake();
        const newCount = attempts + 1;
        setAttempts(newCount);
        const remaining = MAX_ATTEMPTS - newCount;
        if (newCount >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_MS;
          setLockedUntil(until);
          await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: newCount, lockedUntil: until }));
          Toast.show({ type: 'error', text1: 'Demasiados intentos', text2: 'Cuenta bloqueada por 15 minutos', position: 'top', visibilityTime: 4000 });
        } else {
          await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: newCount }));
          Toast.show({
            type: 'error',
            text1: result.error || 'Credenciales incorrectas',
            text2: remaining === 1 ? '⚠️ Último intento antes del bloqueo' : `${remaining} intentos restantes`,
            position: 'top',
            visibilityTime: 3000,
          });
        }
      }
    } catch {
      triggerShake();
      Toast.show({ type: 'error', text1: 'Error de conexión', position: 'top', visibilityTime: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Fondo: negro puro con acento borgoña arriba */}
      {/* Fondo oscuro con presencia de marca */}
      <LinearGradient
        colors={['#2D0F1E', '#160008', '#000000']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Halo guinda en la parte superior */}
      <View style={loginBgStyles.halo} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] },
          ]}
        >
          {/* ---- Marca ---- */}
          <View style={styles.brandSection}>
            {/* Icono cuadrado redondeado estilo Apple */}
            <View style={styles.iconWrap}>
              <LinearGradient
                colors={[BRAND, BRAND_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name="checkmark-done" size={36} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <Text style={styles.appName}>Gestión</Text>
            <Text style={styles.tagline}>Sistema de tareas y coordinación</Text>
          </View>

          {/* ---- Card de formulario ---- */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>

            {/* Banner de bloqueo */}
            {lockedUntil && (
              <View style={styles.lockBanner}>
                <Ionicons name="lock-closed" size={16} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockTitle}>Cuenta bloqueada temporalmente</Text>
                  <Text style={styles.lockSub}>Disponible en {lockTimer}</Text>
                </View>
              </View>
            )}
            {/* Advertencia de intentos */}
            {!lockedUntil && attempts > 0 && (
              <View style={[styles.lockBanner, { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.08)' }]}>
                <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                <Text style={[styles.lockTitle, { color: '#F59E0B' }]}>
                  {MAX_ATTEMPTS - attempts} intento{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} restante{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Campo email */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Correo electrónico</Text>
              <View style={[styles.inputWrap, focusedInput === 'email' && styles.inputFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={focusedInput === 'email' ? BRAND : 'rgba(255,255,255,0.35)'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="usuario@empresa.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Campo contraseña */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Contraseña</Text>
              <View style={[styles.inputWrap, focusedInput === 'password' && styles.inputFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={focusedInput === 'password' ? BRAND : 'rgba(255,255,255,0.35)'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color="rgba(255,255,255,0.35)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* CTA principal */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnLoading]}
              onPress={handleSubmit}
              disabled={loading || !!lockedUntil}
              activeOpacity={0.85}
              style={[lockedUntil && { opacity: 0.5 }]}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.btnText}>Iniciando sesión...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.btnText}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ---- Descarga ---- */}
          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => {
                if (Platform.OS === 'web') window.open('/download.html', '_blank');
                else Linking.openURL('https://to-do-iota-opal.vercel.app/download.html');
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="phone-portrait-outline" size={16} color="rgba(255,255,255,0.55)" />
              <Text style={styles.downloadText}>Ver opciones de descarga</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,
    minHeight: '100%',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },

  // Sección de marca
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrap: {
    marginBottom: 20,
    borderRadius: 28,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 18,
    borderWidth: 1,
    borderColor: 'rgba(159,34,65,0.35)',
  },
  iconGradient: {
    width: 92,
    height: 92,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.42)',
    fontWeight: '400',
    letterSpacing: 0.2,
  },

  // Card de formulario
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.65,
    shadowRadius: 40,
    elevation: 18,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
    letterSpacing: -0.4,
  },

  // Campos
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 50,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: BRAND,
    backgroundColor: '#2C2C2E',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // Botón principal — sólido, sin gradiente
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  btnLoading: {
    opacity: 0.70,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },

  // Footer
  footer: {
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: 'rgba(255,255,255,0.30)',
    fontWeight: '500',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  downloadText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  lockSub: {
    fontSize: 12,
    color: 'rgba(239,68,68,0.75)',
    marginTop: 2,
  },
});

// Estilos del fondo — separados para no contaminar el StyleSheet principal
const loginBgStyles = StyleSheet.create({
  halo: {
    position: 'absolute',
    top: -120,
    left: '50%',
    marginLeft: -180,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: BRAND_GLOW,
    // En web el blur no existe en RN, pero el color translúcido ya da el efecto
  },
});
