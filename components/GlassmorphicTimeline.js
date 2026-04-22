/**
 * GlassmorphicTimeline.js
 * Componente de línea de tiempo con glasmorphism
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicTimeline = ({
  items = [], // [{ title, description, icon, color, timestamp }, ...]
  title,
  variant = 'vertical', // 'vertical' or 'horizontal'
  showConnector = true,
  style,
}) => {
  const { theme, isDark } = useTheme();

  const styles = useMemo(
    () => createStyles(theme, isDark, variant),
    [theme, isDark, variant]
  );

  const itemContent = items.map((item, index) => (
    <View key={index} style={styles.timelineItem}>
      {/* Connector */}
      {showConnector && index > 0 && (
        <View style={[styles.connector, { backgroundColor: item.color || theme.border }]} />
      )}

      {/* Node */}
      <View
        style={[
          styles.node,
          {
            backgroundColor: item.color || theme.primary,
            borderColor: theme.border,
          },
        ]}
      >
        {item.icon ? (
          <Ionicons
            name={item.icon}
            size={16}
            color="#fff"
          />
        ) : (
          <View style={styles.nodeDefault} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.itemTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={[styles.itemDescription, { color: theme.textMuted }]}>
            {item.description}
          </Text>
        )}
        {item.timestamp && (
          <Text style={[styles.itemTimestamp, { color: theme.textMuted }]}>
            {item.timestamp}
          </Text>
        )}
      </View>
    </View>
  ));

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          flexDirection: variant === 'horizontal' ? 'row' : 'column',
        },
      ]}
    >
      {Platform.OS === 'web' ? (
        <View style={styles.backdrop} />
      ) : (
        <BlurView intensity={75} style={styles.backdrop} />
      )}

      {title && (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      )}

      <View style={styles.timelineContainer}>
        {itemContent}
      </View>

      {/* Highlight & Glow */}
      <View style={styles.highlight} />
      <View
        style={[
          styles.rimGlow,
          { borderColor: theme.glassBorder },
        ]}
      />
    </View>
  );

  if (variant === 'horizontal') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={style}>{content}</View>;
};

const createStyles = (theme, isDark, variant) =>
  StyleSheet.create({
    container: {
      borderRadius: 16,
      overflow: 'hidden',
      padding: 16,
      position: 'relative',
      gap: 12,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
      zIndex: 1,
    },
    timelineContainer: {
      zIndex: 1,
      gap: 0,
    },
    timelineItem: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 8,
      position: 'relative',
    },
    connector: {
      position: 'absolute',
      left: 20,
      top: 40,
      width: 2,
      height: 32,
    },
    node: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    nodeDefault: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#fff',
    },
    content: {
      flex: 1,
      gap: 4,
      justifyContent: 'center',
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    itemDescription: {
      fontSize: 13,
    },
    itemTimestamp: {
      fontSize: 11,
      fontWeight: '500',
    },
    highlight: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.3)',
    },
    rimGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 1,
      borderRadius: 16,
      pointerEvents: 'none',
    },
  });

export default GlassmorphicTimeline;
