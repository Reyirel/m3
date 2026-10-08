// components/ui/Card.js
// Tarjeta de la app: superficie sólida elevada, borde fino y sombra suave.
// Es la base de todas las tarjetas (las antiguas PremiumGlassCard y GlassCard la usan).
import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { RADIUS, SPACING } from '../../theme/tokens';
import { PRESS_SCALE, SPRING, spring } from '../../theme/motion';

export default function Card({
  children,
  style,
  padding = SPACING.lg,
  borderRadius = RADIUS.md,
  // Tarjeta resaltada: un nivel más de elevación
  highlighted = false,
  // Color de acento del borde (foco, error, selección)
  accentColor = null,
  backgroundColor = null,
  borderColor = null,
  onPress = null,
  accessible,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const surface = [
    styles.card,
    {
      padding,
      borderRadius,
      backgroundColor: backgroundColor || (highlighted ? theme.cardElevated : theme.card),
      borderColor: accentColor || borderColor || theme.glassBorder,
      borderWidth: accentColor ? 1.5 : StyleSheet.hairlineWidth,
      shadowColor: theme.shadowColor,
      shadowOpacity: theme.isDark ? 0.3 : 0.06,
    },
  ];

  if (!onPress) {
    return (
      <View
        style={[surface, style]}
        accessible={accessible}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
      >
        {children}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => spring(scale, PRESS_SCALE, SPRING.press).start()}
      onPressOut={() => spring(scale, 1, SPRING.press).start()}
      activeOpacity={1}
      style={style}
      accessibilityRole={accessibilityRole || 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      <Animated.View style={[surface, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
});
