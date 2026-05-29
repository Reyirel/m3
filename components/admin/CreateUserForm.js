// components/admin/CreateUserForm.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { registerUser } from '../../services/authFirestore';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';

export default function CreateUserForm({ onUserCreated, isUserAdmin }) {
  const { theme } = useTheme();
  const { showSuccess, showError, showWarning } = useNotification();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('director');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const createUser = useCallback(async () => {
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) {
      showError('Por favor completa nombre, email y contraseña');
      return;
    }

    if (!validateEmail(userEmail.trim())) {
      showError('Por favor ingresa un email válido');
      return;
    }

    if (userPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!isUserAdmin) {
      showWarning('Solo los administradores pueden crear usuarios');
      return;
    }

    try {
      const result = await registerUser(userEmail.trim(), userPassword, userName.trim(), userRole);

      if (result.success) {
        showSuccess(`${userName} ha sido agregado como ${userRole}`);
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        setUserRole('director');
        if (onUserCreated) onUserCreated();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('No se pudo crear el usuario: ' + error.message);
    }
  }, [userName, userEmail, userPassword, userRole, isUserAdmin, showError, showWarning, showSuccess, onUserCreated]);

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.isDark
            ? 'rgba(30, 30, 35, 0.95)'
            : 'rgba(255, 255, 255, 0.98)',
          borderColor: theme.isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          style={styles.iconCircleSection}
        >
          <Ionicons name="person-add" size={24} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Crear Usuario
        </Text>
      </View>

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Ionicons
          name="person-outline"
          size={20}
          color={theme.textSecondary}
          style={styles.inputIcon}
        />
        <TextInput
          placeholder="Nombre del usuario"
          placeholderTextColor={theme.textSecondary}
          value={userName}
          onChangeText={setUserName}
          style={[styles.input, { color: theme.text }]}
          autoCapitalize="words"
        />
      </View>

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Ionicons
          name="mail-outline"
          size={20}
          color={theme.textSecondary}
          style={styles.inputIcon}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          value={userEmail}
          onChangeText={setUserEmail}
          style={[styles.input, { color: theme.text }]}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={theme.textSecondary}
          style={styles.inputIcon}
        />
        <TextInput
          placeholder="Contraseña"
          placeholderTextColor={theme.textSecondary}
          value={userPassword}
          onChangeText={setUserPassword}
          style={[styles.input, { color: theme.text }]}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <Text style={[styles.roleSelectorLabel, { color: theme.textSecondary }]}>
        Seleccionar Rol:
      </Text>
      <View style={styles.roleSelector}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            { backgroundColor: theme.background, borderColor: theme.border },
            userRole === 'director' && {
              backgroundColor: '#235B4E',
              borderColor: '#235B4E',
            },
          ]}
          onPress={() => {
            hapticLight();
            setUserRole('director');
          }}
        >
          <Text
            style={[
              styles.roleButtonText,
              { color: theme.text },
              userRole === 'director' && { color: '#FFFFFF' },
            ]}
          >
            Director
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.roleButton,
            { backgroundColor: theme.background, borderColor: theme.border },
            userRole === 'secretario' && {
              backgroundColor: theme.primary,
              borderColor: theme.primary,
            },
          ]}
          onPress={() => {
            hapticLight();
            setUserRole('secretario');
          }}
        >
          <Text
            style={[
              styles.roleButtonText,
              { color: theme.text },
              userRole === 'secretario' && { color: '#FFFFFF' },
            ]}
          >
            Secretario
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.roleButton,
            { backgroundColor: theme.background, borderColor: theme.border },
            userRole === 'admin' && {
              backgroundColor: theme.error,
              borderColor: theme.error,
            },
          ]}
          onPress={() => {
            hapticLight();
            setUserRole('admin');
          }}
        >
          <Text
            style={[
              styles.roleButtonText,
              { color: theme.text },
              userRole === 'admin' && { color: '#FFFFFF' },
            ]}
          >
            Admin
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => {
          hapticMedium();
          createUser();
        }}
      >
        <LinearGradient
          colors={['#34C759', '#30B351']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Ionicons
            name="add-circle"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.buttonText}>Crear Usuario</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconCircleSection: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 52,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  roleSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2.5,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actionButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    minHeight: 52,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
