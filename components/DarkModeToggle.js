/**
 * Dark Mode Toggle Component
 * Integrates new EnhancedTheme dark mode functionality
 */

import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../theme/enhancedTheme';

export default function DarkModeToggle({ variant = 'switch' }) {
  const { isDark, toggleDarkMode, theme } = useContext(ThemeContext);

  if (variant === 'switch') {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Ionicons 
              name={isDark ? 'moon' : 'sunny'} 
              size={20} 
              color={theme.primary} 
            />
            <Text style={[styles.label, { color: theme.text }]}>
              {isDark ? 'Modo Oscuro' : 'Modo Claro'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#ccc', true: theme.primary }}
            thumbColor={isDark ? theme.primaryLight : '#f4f3f4'}
          />
        </View>
      </View>
    );
  }

  if (variant === 'button') {
    return (
      <TouchableOpacity
        onPress={toggleDarkMode}
        style={[
          styles.buttonContainer,
          { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' },
        ]}
      >
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={24}
          color={theme.primary}
        />
        <Text style={[styles.buttonText, { color: theme.text }]}>
          {isDark ? 'Oscuro' : 'Claro'}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'card') {
    return (
      <View style={[styles.cardContainer, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={28}
              color={theme.primary}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Tema {isDark ? 'Oscuro' : 'Claro'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              {isDark
                ? 'Aprovecharás más la batería'
                : 'Mejor visibilidad en luz natural'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={toggleDarkMode}
          style={[
            styles.toggleButton,
            { backgroundColor: isDark ? theme.primaryDark : theme.primaryLight },
          ]}
        >
          <Text style={styles.toggleButtonText}>
            {isDark ? 'Cambiar' : 'Activar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(159, 34, 65, 0.1)',
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
