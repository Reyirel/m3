/**
 * GlassmorphicMenu.js
 * Componente de menú desplegable con glasmorphism
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicMenu = ({
  items = [], // [{ label, icon, onPress, destructive }, ...]
  trigger, // React.ReactNode - what shows before menu opens
  triggerIcon = 'ellipsis-vertical',
  triggerSize = 24,
  triggerColor,
  position = 'bottom', // 'bottom' or 'top'
  align = 'right', // 'left' or 'right'
}) => {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const triggerCol = triggerColor || theme.text;

  const renderMenuItem = ({ item, index }) => (
    <TouchableOpacity
      key={index}
      onPress={() => {
        item.onPress?.();
        setVisible(false);
      }}
      activeOpacity={0.6}
      style={styles.menuItemTouchable}
    >
      <View
        style={[
          styles.menuItem,
          {
            borderBottomColor: index < items.length - 1 ? theme.border : 'transparent',
          },
        ]}
      >
        {item.icon && (
          <Ionicons
            name={item.icon}
            size={18}
            color={item.destructive ? theme.error : theme.primary}
          />
        )}
        <Text
          style={[
            styles.menuItemText,
            {
              color: item.destructive ? theme.error : theme.text,
            },
          ]}
        >
          {item.label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      {/* Trigger Button */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.6}
        style={styles.trigger}
      >
        {trigger ? (
          trigger
        ) : (
          <Ionicons
            name={triggerIcon}
            size={triggerSize}
            color={triggerCol}
          />
        )}
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdrop}
          onPress={() => setVisible(false)}
        >
          {/* Menu Container */}
          <View style={styles.menuContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.menuContent}>
                <FlatList
                  data={items}
                  renderItem={renderMenuItem}
                  keyExtractor={(_, i) => i.toString()}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              <BlurView intensity={80} style={styles.menuContent}>
                <FlatList
                  data={items}
                  renderItem={renderMenuItem}
                  keyExtractor={(_, i) => i.toString()}
                  scrollEnabled={false}
                />
              </BlurView>
            )}

            {/* Highlight & Glow */}
            <View style={styles.highlight} />
            <View style={[styles.rimGlow, { borderColor: theme.glassBorder }]} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const createStyles = (theme, isDark) =>
  StyleSheet.create({
    trigger: {
      padding: 8,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuContainer: {
      minWidth: 200,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.cardBackground,
      position: 'relative',
    },
    menuContent: {
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
      borderBottomWidth: 1,
    },
    menuItemTouchable: {
      overflow: 'hidden',
    },
    menuItemText: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
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

export default GlassmorphicMenu;
