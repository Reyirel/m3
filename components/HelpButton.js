// components/HelpButton.js
// Botón de ayuda que muestra un modal con explicación de la pantalla
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  ScrollView, 
  Animated,
  Platform,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RADIUS, SHADOWS } from '../theme/tokens';

Dimensions.get('window');

/**
 * HelpButton - Botón de ayuda contextual
 * @param {string} title - Título del modal de ayuda
 * @param {Array} items - Array de objetos { icon, title, description }
 * @param {string} style - Estilo adicional para el botón
 * @param {string} variant - 'header' | 'floating' | 'inline'
 * @param {string} size - 'small' | 'medium' | 'large'
 */
export default function HelpButton({ 
  title = 'Ayuda',
  items = [],
  style,
  variant = 'header',
  size = 'medium',
  color
}) {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.9);
    }
  }, [modalVisible, fadeAnim, scaleAnim, slideAnim]);

  const buttonSizes = {
    small: { width: 28, height: 28, iconSize: 14 },
    medium: { width: 36, height: 36, iconSize: 18 },
    large: { width: 44, height: 44, iconSize: 22 },
  };

  const { width: btnWidth, height: btnHeight, iconSize } = buttonSizes[size] || buttonSizes.medium;
  const buttonColor = color || (variant === 'header' ? 'rgba(255,255,255,0.2)' : theme.primary + '15');
  const iconColor = variant === 'header' ? '#FFFFFF' : theme.primary;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: btnWidth,
            height: btnHeight,
            borderRadius: btnWidth / 2,
            backgroundColor: buttonColor,
          },
          variant === 'floating' && styles.floatingButton,
          style,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="help-circle-outline" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                backgroundColor: theme.cardBackground,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.helpIconBadge, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="help-circle" size={28} color={theme.primary} />
              </View>
              <View style={styles.modalTitleContainer}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Guía rápida de uso
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {items.map((item, index) => (
                <View 
                  key={index}
                  style={[
                    styles.helpItem,
                    { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
                    }
                  ]}
                >
                  <View style={[styles.helpItemIcon, { backgroundColor: (item.color || theme.primary) + '15' }]}>
                    <Ionicons 
                      name={item.icon || 'information-circle'} 
                      size={20} 
                      color={item.color || theme.primary} 
                    />
                  </View>
                  <View style={styles.helpItemContent}>
                    <Text style={[styles.helpItemTitle, { color: theme.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.helpItemDescription, { color: theme.textSecondary }]}>
                      {item.description}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
              <TouchableOpacity
                style={[styles.gotItButton, { backgroundColor: theme.primary }]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.gotItButtonText}>¡Entendido!</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    ...Platform.select({ android: { elevation: 6 } }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    gap: 14,
  },
  helpIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalScrollContent: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  helpItem: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 12,
  },
  helpItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpItemContent: {
    flex: 1,
  },
  helpItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  helpItemDescription: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  modalFooter: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  gotItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  gotItButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
