// components/CollapsibleSection.js
// Sección colapsable reutilizable para organizar contenido
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  LayoutAnimation, 
  Platform, 
  UIManager 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * CollapsibleSection - Sección colapsable con animación suave
 * 
 * @param {string} title - Título de la sección
 * @param {string} icon - Nombre del ícono Ionicons
 * @param {boolean} defaultExpanded - Si está expandida por defecto
 * @param {number} badge - Número para mostrar como badge (opcional)
 * @param {string} badgeColor - Color del badge
 * @param {React.ReactNode} children - Contenido de la sección
 * @param {React.ReactNode} rightElement - Elemento a la derecha del título
 * @param {function} onToggle - Callback cuando se expande/colapsa
 */
const CollapsibleSection = ({ 
  title, 
  icon = 'chevron-down',
  defaultExpanded = true,
  badge,
  badgeColor,
  children,
  rightElement,
  onToggle,
  headerStyle,
  containerStyle,
}) => {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newState = !isExpanded;
    setIsExpanded(newState);

    Animated.spring(rotateAnim, {
      toValue: newState ? 1 : 0,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();

    if (onToggle) {
      onToggle(newState);
    }
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const styles = StyleSheet.create({
    container: {
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor: theme.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    chevron: {
      padding: 4,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity 
        style={[styles.header, headerStyle]} 
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={18} color={theme.primary} />
            </View>
          )}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        
        <View style={styles.headerRight}>
          {badge !== undefined && badge !== null && (
            <View style={[styles.badge, { backgroundColor: badgeColor || theme.primary }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          {rightElement}
          <Animated.View style={[styles.chevron, { transform: [{ rotate: rotation }] }]}>
            <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
          </Animated.View>
        </View>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

export default CollapsibleSection;
