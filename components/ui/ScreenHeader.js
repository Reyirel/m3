import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function ScreenHeader({ title, subtitle, icon, actions = [], onBack }) {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={theme.gradientHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.actionBtn, { marginRight: 12 }]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.90)" />
          </TouchableOpacity>
        )}

        <View style={styles.titleBlock}>
          {icon && !onBack && (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={20} color="rgba(255,255,255,0.90)" />
            </View>
          )}
          <View style={styles.textBlock}>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        {actions.length > 0 && (
          <View style={styles.actionsRow}>
            {actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                onPress={action.onPress}
                disabled={action.disabled}
                style={[styles.actionBtn, action.disabled && { opacity: 0.4 }]}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.color || 'rgba(255,255,255,0.90)'}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.62)',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
