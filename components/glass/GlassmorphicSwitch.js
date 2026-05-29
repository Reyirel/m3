/**
 * GlassmorphicSwitch.js
 * Advanced glassmorphic switch with on/off labels and animated state
 * 
 * Usage:
 * <GlassmorphicSwitch
 *   value={isOn}
 *   onValueChange={setIsOn}
 *   onLabel="On"
 *   offLabel="Off"
 *   direction="row"
 * />
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

const GlassmorphicSwitch = ({
  value = false,
  onValueChange,
  onLabel = 'On',
  offLabel = 'Off',
  onIcon,
  offIcon,
  direction = 'horizontal', // 'horizontal', 'vertical'
  disabled = false,
  size = 'medium', // 'small', 'medium', 'large'
  style,
}) => {
  const { theme, isDark } = useTheme();

  const sizeConfig = {
    small: { gap: 4, fontSize: 11, padding: 6 },
    medium: { gap: 6, fontSize: 12, padding: 8 },
    large: { gap: 8, fontSize: 14, padding: 12 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const isRow = direction === 'horizontal';

  const handlePress = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.container,
        isRow ? styles.containerRow : styles.containerCol,
        {
          backgroundColor: isDark
            ? 'rgba(0,0,0,0.3)'
            : 'rgba(255,255,255,0.4)',
          borderColor: isDark
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.6)',
          opacity: disabled ? 0.5 : 1,
          gap: config.gap,
        },
        style,
      ]}
    >
      <BlurView intensity={70} style={styles.blurContent}>
        {/* On Button */}
        <View
          style={[
            styles.button,
            {
              backgroundColor: value
                ? theme.primary
                : isDark
                  ? 'rgba(0,0,0,0.2)'
                  : 'rgba(255,255,255,0.2)',
              paddingHorizontal: config.padding,
              paddingVertical: config.padding * 0.75,
              gap: config.gap,
            },
          ]}
        >
          {onIcon && (
            <Ionicons
              name={onIcon}
              size={config.fontSize + 2}
              color={value ? '#fff' : theme.textSecondary}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              {
                color: value ? '#fff' : theme.text,
                fontSize: config.fontSize,
                fontWeight: value ? '600' : '500',
              },
            ]}
          >
            {onLabel}
          </Text>
        </View>

        {/* Off Button */}
        <View
          style={[
            styles.button,
            {
              backgroundColor: !value
                ? '#ef4444'
                : isDark
                  ? 'rgba(0,0,0,0.2)'
                  : 'rgba(255,255,255,0.2)',
              paddingHorizontal: config.padding,
              paddingVertical: config.padding * 0.75,
              gap: config.gap,
            },
          ]}
        >
          {offIcon && (
            <Ionicons
              name={offIcon}
              size={config.fontSize + 2}
              color={!value ? '#fff' : theme.textSecondary}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              {
                color: !value ? '#fff' : theme.text,
                fontSize: config.fontSize,
                fontWeight: !value ? '600' : '500',
              },
            ]}
          >
            {offLabel}
          </Text>
        </View>
      </BlurView>

      {/* Highlight stripe */}
      <View
        style={[
          styles.highlightStripe,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(255,255,255,0.6)',
          },
        ]}
      />

      {/* Rim glow */}
      <View
        style={[
          styles.rimGlow,
          {
            borderColor: value
              ? `${theme.primary}40`
              : '#ef444440',
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  containerRow: {
    flexDirection: 'row',
  },
  containerCol: {
    flexDirection: 'column',
  },
  blurContent: {
    flex: 1,
    flexDirection: 'inherit',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonText: {
    fontWeight: '500',
  },
  highlightStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1,
  },
});

export default GlassmorphicSwitch;
