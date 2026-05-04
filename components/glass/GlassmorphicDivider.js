/**
 * GlassmorphicDivider.js
 * Glassmorphic divider/separator component
 * 
 * Usage:
 * <GlassmorphicDivider />
 * <GlassmorphicDivider label="OR" />
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const GlassmorphicDivider = ({
  label,
  orientation = 'horizontal', // 'horizontal' | 'vertical'
  style,
}) => {
  const { theme, isDark } = useTheme();

  const dividerColor = isDark
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(255,255,255,0.6)';

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.verticalDivider,
          { backgroundColor: dividerColor },
          style,
        ]}
      />
    );
  }

  return (
    <View style={[styles.horizontalContainer, style]}>
      <View
        style={[
          styles.horizontalDivider,
          { backgroundColor: dividerColor },
        ]}
      />
      {label && (
        <Text
          style={[
            styles.label,
            { color: theme.textSecondary },
          ]}
        >
          {label}
        </Text>
      )}
      {label && (
        <View
          style={[
            styles.horizontalDivider,
            { backgroundColor: dividerColor },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  horizontalDivider: {
    flex: 1,
    height: 1,
  },
  verticalDivider: {
    width: 1,
    height: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default GlassmorphicDivider;
