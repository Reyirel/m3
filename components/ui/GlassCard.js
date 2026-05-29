import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function GlassCard({ style, children, elevated = false, ...props }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.glass,
          borderColor: theme.glassBorder,
          shadowColor: theme.shadowColor,
        },
        elevated && styles.elevated,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
});
