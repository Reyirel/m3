// components/Tooltip.js
// Tooltip informativo para dar contexto en métricas y elementos de UI
// Funciona con long-press en móvil y hover en web

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function Tooltip({
  children,
  content,
  title = null,
  position = 'top', // top, bottom, left, right
  showIcon = false,
  iconName = 'information-circle-outline',
  iconSize = 16,
  iconColor = null,
  maxWidth = 220,
}) {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const containerRef = useRef(null);

  const showTooltip = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideTooltip = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  const measureLayout = () => {
    if (containerRef.current) {
      containerRef.current.measureInWindow((x, y, width, height) => {
        setLayout({ x, y, width, height });
      });
    }
  };

  const getTooltipPosition = () => {
    const offset = 8;
    switch (position) {
      case 'bottom':
        return {
          top: layout.y + layout.height + offset,
          left: layout.x + layout.width / 2,
          transform: [{ translateX: -maxWidth / 2 }],
        };
      case 'left':
        return {
          top: layout.y + layout.height / 2,
          left: layout.x - offset,
          transform: [{ translateX: -maxWidth }, { translateY: -20 }],
        };
      case 'right':
        return {
          top: layout.y + layout.height / 2,
          left: layout.x + layout.width + offset,
          transform: [{ translateY: -20 }],
        };
      default: // top
        return {
          top: layout.y - offset,
          left: layout.x + layout.width / 2,
          transform: [{ translateX: -maxWidth / 2 }, { translateY: -60 }],
        };
    }
  };

  const tooltipBg = isDark ? '#374151' : '#1F2937';

  // En web usamos hover, en móvil usamos long-press
  const isWeb = Platform.OS === 'web';

  const TriggerComponent = () => (
    <View
      ref={containerRef}
      onLayout={measureLayout}
      style={styles.triggerContainer}
    >
      {children}
      {showIcon && (
        <Ionicons
          name={iconName}
          size={iconSize}
          color={iconColor || theme.textSecondary}
          style={styles.icon}
        />
      )}
    </View>
  );

  if (isWeb) {
    return (
      <View
        style={styles.wrapper}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        <TriggerComponent />
        {visible && (
          <Animated.View
            style={[
              styles.tooltipContainer,
              {
                backgroundColor: tooltipBg,
                maxWidth,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                ...getTooltipPosition(),
              },
            ]}
          >
            {title && (
              <Text style={styles.tooltipTitle}>{title}</Text>
            )}
            <Text style={styles.tooltipContent}>{content}</Text>
            <View style={[styles.arrow, { borderBottomColor: tooltipBg }]} />
          </Animated.View>
        )}
      </View>
    );
  }

  // Móvil: usar Modal + LongPress
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onLongPress={() => {
          measureLayout();
          showTooltip();
        }}
        delayLongPress={300}
        activeOpacity={0.8}
      >
        <TriggerComponent />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={hideTooltip}
      >
        <Pressable style={styles.modalOverlay} onPress={hideTooltip}>
          <Animated.View
            style={[
              styles.tooltipContainer,
              styles.tooltipMobile,
              {
                backgroundColor: tooltipBg,
                maxWidth: maxWidth + 40,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {title && (
              <Text style={styles.tooltipTitle}>{title}</Text>
            )}
            <Text style={styles.tooltipContent}>{content}</Text>
            <Text style={styles.dismissHint}>Toca para cerrar</Text>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  triggerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginLeft: 4,
    opacity: 0.7,
  },
  tooltipContainer: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  tooltipMobile: {
    position: 'relative',
    marginHorizontal: 20,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tooltipContent: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E5E7EB',
    lineHeight: 18,
  },
  dismissHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  arrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
