// screens/LoginScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
  Linking, ActivityIndicator, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from '../services/authFirestore';
import Toast from 'react-native-toast-message';

const BRAND = '#9F2241';
const BRAND_DARK = '#7A1A32';
const BRAND_GLOW = 'rgba(159, 34, 65, 0.35)';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(32)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

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
    if (!email.trim() || !password.trim()) {
      triggerShake();
      Toast.show({ type: 'error', text1: 'Completa todos los campos', position: 'top', visibilityTime: 2500 });
      return;
    }
    setLoading(true);
    try {
      const result = await loginUser(email.trim().toLowerCase(), password);
      if (result.success) {
        Toast.show({ type: 'success', text1: 'Bienvenido', position: 'bottom', visibilityTime: 1500 });
        setTimeout(() => { if (onLogin) onLogin(); }, 600);
      } else {
        triggerShake();
        Toast.show({ type: 'error', text1: result.error || 'Credenciales incorrectas', position: 'top', visibilityTime: 3000 });
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
              disabled={loading}
              activeOpacity={0.85}
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
