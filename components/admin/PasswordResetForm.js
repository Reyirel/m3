// components/admin/PasswordResetForm.js
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
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { hashPassword } from '../../utils/hashUtils';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { hapticMedium } from '../../utils/haptics';

export default function PasswordResetForm({ isUserAdmin }) {
  const { theme } = useTheme();
  const { showSuccess, showError, showWarning } = useNotification();

  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const resetUserPassword = useCallback(async () => {
    if (!resetEmail.trim() || !newPassword.trim()) {
      showError('Por favor completa email y nueva contraseña');
      return;
    }

    if (newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!isUserAdmin) {
      showWarning('Solo los administradores pueden resetear contraseñas');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', resetEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showError('Usuario no encontrado');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const hashedPassword = await hashPassword(newPassword, resetEmail.toLowerCase());
      await updateDoc(doc(db, 'users', userDoc.id), {
        password: hashedPassword,
      });

      showSuccess('La contraseña ha sido actualizada');
      setResetEmail('');
      setNewPassword('');
    } catch (error) {
      showError('No se pudo resetear la contraseña: ' + error.message);
    }
  }, [resetEmail, newPassword, isUserAdmin, showError, showWarning, showSuccess]);

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
          colors={[theme.warning, theme.warning]}
          style={styles.iconCircleSection}
        >
          <Ionicons name="key" size={24} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Resetear Contraseña
        </Text>
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
          placeholder="Email del usuario"
          placeholderTextColor={theme.textSecondary}
          value={resetEmail}
          onChangeText={setResetEmail}
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
          placeholder="Nueva contraseña"
          placeholderTextColor={theme.textSecondary}
          value={newPassword}
          onChangeText={setNewPassword}
          style={[styles.input, { color: theme.text }]}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => {
          hapticMedium();
          resetUserPassword();
        }}
      >
        <LinearGradient
          colors={[theme.warning, theme.warning]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Ionicons
            name="refresh"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.buttonText}>Resetear Contraseña</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={[styles.helpText, { color: theme.textSecondary }]}>
        Solo administradores pueden resetear contraseñas de otros usuarios.
      </Text>
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
  helpText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
    opacity: 0.7,
  },
});
