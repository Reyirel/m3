// screens/LoginScreen.js
// Inicio de sesión. Misma identidad que el resto de la app: encabezado guinda con el
// logotipo (igual que la pantalla de inicio animada) y el formulario en una tarjeta con
// los colores del tema, así que respeta el modo claro y el oscuro.
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
  Linking, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginUser } from '../services/authFirestore';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import { RADIUS, SPACING, TYPOGRAPHY } from '../theme/tokens';
import { ACTIVE_OPACITY, DURATION, spring, timing } from '../theme/motion';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos
// Los intentos fallidos dejan de contar pasado este tiempo sin nuevos errores
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPTS_KEY = 'login_attempts_by_email';

export default function LoginScreen({ onLogin }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);
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

  // Intentos fallidos POR CUENTA (correo). Antes era un solo contador por dispositivo:
  // cinco errores con cualquier cuenta bloqueaban también a las demás, y los intentos
  // viejos nunca caducaban.
  const attemptsMapRef = useRef({});

  const emailKey = (value) => (value || '').trim().toLowerCase();

  // Estado vigente de una cuenta: descarta bloqueos vencidos e intentos antiguos
  const getEntry = (key) => {
    const entry = attemptsMapRef.current[key];
    if (!entry) return null;
    const now = Date.now();
    if (entry.lockedUntil) return now < entry.lockedUntil ? entry : null;
    return now - (entry.lastAt || 0) < ATTEMPT_WINDOW_MS ? entry : null;
  };

  const saveAttempts = async () => {
    try {
      await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attemptsMapRef.current));
    } catch {}
  };

  const showEntryFor = (value) => {
    const entry = getEntry(emailKey(value));
    setAttempts(entry?.count || 0);
    setLockedUntil(entry?.lockedUntil || null);
  };

  useEffect(() => {
    Animated.parallel([
      timing(fadeAnim, 1, { duration: DURATION.slow, easing: Easing.out(Easing.cubic) }),
      spring(slideAnim, 0),
    ]).start();

    // Restaurar intentos guardados
    AsyncStorage.getItem(ATTEMPTS_KEY).then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') attemptsMapRef.current = data;
      } catch {}
    });
    // El contador anterior (uno solo para todo el dispositivo) ya no se usa
    AsyncStorage.removeItem('login_attempts').catch(() => {});
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar de correo se muestra el estado de ESA cuenta
  useEffect(() => {
    showEntryFor(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Cuenta regresiva del bloqueo
  useEffect(() => {
    if (!lockedUntil) { setLockTimer(''); return; }
    const update = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        delete attemptsMapRef.current[emailKey(email)];
        saveAttempts();
        setLockedUntil(null);
        setAttempts(0);
        setLockTimer('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedUntil]);

  const triggerShake = () => {
    Animated.sequence([
      timing(shakeAnim, 9, { duration: 50 }),
      timing(shakeAnim, -8, { duration: 50 }),
      timing(shakeAnim, 6, { duration: 50 }),
      timing(shakeAnim, -4, { duration: 50 }),
      timing(shakeAnim, 0, { duration: 50 }),
    ]).start();
  };

  const handleSubmit = async () => {
    const key = emailKey(email);
    const current = getEntry(key);
    if (current?.lockedUntil) {
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
      let result = await loginUser(key, password);
      // El teclado del celular suele agregar un espacio al final al autocompletar
      if (!result.success && result.code === 'wrong-password' && password !== password.trim()) {
        result = await loginUser(key, password.trim());
      }

      if (result.success) {
        delete attemptsMapRef.current[key];
        await saveAttempts();
        setAttempts(0);
        Toast.show({ type: 'success', text1: 'Bienvenido', position: 'bottom', visibilityTime: 1500 });
        setTimeout(() => { if (onLogin) onLogin(); }, 600);
        return;
      }

      triggerShake();

      // Solo una contraseña equivocada cuenta como intento. Un correo mal escrito,
      // una cuenta desactivada o una falla de conexión no deben bloquear a nadie.
      if (result.code !== 'wrong-password') {
        Toast.show({ type: 'error', text1: result.error || 'No se pudo iniciar sesión', position: 'top', visibilityTime: 3500 });
        return;
      }

      const newCount = (current?.count || 0) + 1;
      const remaining = MAX_ATTEMPTS - newCount;
      if (newCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        attemptsMapRef.current[key] = { count: newCount, lastAt: Date.now(), lockedUntil: until };
        setAttempts(newCount);
        setLockedUntil(until);
        Toast.show({ type: 'error', text1: 'Demasiados intentos', text2: `Esta cuenta queda bloqueada ${LOCKOUT_MS / 60000} minutos en este dispositivo`, position: 'top', visibilityTime: 4000 });
      } else {
        attemptsMapRef.current[key] = { count: newCount, lastAt: Date.now() };
        setAttempts(newCount);
        Toast.show({
          type: 'error',
          text1: result.error || 'Credenciales incorrectas',
          text2: remaining === 1 ? 'Último intento antes del bloqueo' : `${remaining} intentos restantes`,
          position: 'top',
          visibilityTime: 3000,
        });
      }
      await saveAttempts();
    } catch {
      triggerShake();
      Toast.show({ type: 'error', text1: 'Error de conexión', position: 'top', visibilityTime: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const remainingAttempts = MAX_ATTEMPTS - attempts;

  const field = (name, label, icon, inputProps, trailing) => {
    const focused = focusedInput === name;
    return (
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: theme.background, borderColor: focused ? theme.primary : theme.borderLight },
          ]}
        >
          <Ionicons name={icon} size={18} color={focused ? theme.primary : theme.textTertiary} />
          <TextInput
            style={[styles.input, { color: theme.text }, Platform.OS === 'web' && { outlineStyle: 'none' }]}
            placeholderTextColor={theme.textMuted}
            onFocus={() => setFocusedInput(name)}
            onBlur={() => setFocusedInput(null)}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={label}
            {...inputProps}
          />
          {trailing}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Encabezado guinda con el logotipo: el mismo de la pantalla de inicio */}
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + SPACING.xxl }]}
        >
          <Image source={require('../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName} accessibilityRole="header">Sistema de Gestión Municipal</Text>
          <Text style={styles.tagline}>Tareas y coordinación entre áreas</Text>
        </LinearGradient>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] },
          ]}
        >
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.glassBorder, shadowColor: theme.shadowColor }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Iniciar sesión</Text>

            {lockedUntil && (
              <View style={[styles.banner, { backgroundColor: theme.errorAlpha, borderColor: theme.error }]} accessibilityRole="alert">
                <Ionicons name="lock-closed" size={18} color={theme.error} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerTitle, { color: theme.error }]}>Cuenta bloqueada temporalmente</Text>
                  <Text style={[styles.bannerSub, { color: theme.textSecondary }]}>Disponible en {lockTimer}</Text>
                </View>
              </View>
            )}
            {!lockedUntil && attempts > 0 && (
              <View style={[styles.banner, { backgroundColor: theme.warningAlpha, borderColor: theme.warning }]} accessibilityRole="alert">
                <Ionicons name="warning-outline" size={18} color={theme.warningText} />
                <Text style={[styles.bannerTitle, { color: theme.warningText }]}>
                  {remainingAttempts} {remainingAttempts === 1 ? 'intento restante' : 'intentos restantes'}
                </Text>
              </View>
            )}

            {field('email', 'Correo electrónico', 'mail-outline', {
              value: email,
              onChangeText: setEmail,
              placeholder: 'nombre@correo.com',
              keyboardType: 'email-address',
              autoComplete: 'email',
              textContentType: 'username',
              returnKeyType: 'next',
              onSubmitEditing: () => passwordRef.current?.focus(),
            })}

            {field('password', 'Contraseña', 'lock-closed-outline', {
              ref: passwordRef,
              value: password,
              onChangeText: setPassword,
              placeholder: 'Tu contraseña',
              secureTextEntry: !showPassword,
              autoComplete: 'current-password',
              textContentType: 'password',
              returnKeyType: 'go',
              onSubmitEditing: handleSubmit,
            }, (
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={ACTIVE_OPACITY}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            ))}

            <View style={styles.submit}>
              <PrimaryButton
                title={loading ? 'Iniciando sesión…' : 'Entrar'}
                onPress={handleSubmit}
                loading={loading}
                disabled={!!lockedUntil}
                icon="arrow-forward"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => {
              if (Platform.OS === 'web') window.open('/download.html', '_blank');
              else Linking.openURL('https://to-do-iota-opal.vercel.app/download.html');
            }}
            activeOpacity={ACTIVE_OPACITY}
            accessibilityRole="link"
          >
            <Ionicons name="phone-portrait-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.downloadText, { color: theme.textSecondary }]}>Instalar la app en tu teléfono</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// El formulario se monta sobre el borde inferior del encabezado
const CARD_OVERLAP = 40;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: SPACING.xxl,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: CARD_OVERLAP + SPACING.xl,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: SPACING.md,
  },
  appName: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  tagline: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
    textAlign: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    marginTop: -CARD_OVERLAP,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.xl,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  cardTitle: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginBottom: SPACING.xs + 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    height: 52,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.sm + 2,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  eyeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submit: {
    marginTop: SPACING.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    borderWidth: 1,
    borderRadius: RADIUS.sm + 2,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  bannerTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  bannerSub: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 44,
    marginTop: SPACING.lg,
  },
  downloadText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
  },
});
