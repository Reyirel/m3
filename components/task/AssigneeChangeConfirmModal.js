// components/task/AssigneeChangeConfirmModal.js
// Modal de confirmación cuando se detectan cambios en los asignados de una tarea.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassmorphicButton from '../glass/GlassmorphicButton';

/**
 * Props:
 *  visible        — boolean
 *  onClose        — () => void  (cancelar)
 *  onConfirm      — async () => void  (confirmar y proceder con el guardado)
 *  changeData     — { removed: string[], added: string[] } | null
 *  theme          — objeto de tema
 *  isDark         — boolean
 */
export default function AssigneeChangeConfirmModal({
  visible,
  onClose,
  onConfirm,
  changeData,
  theme,
  isDark,
}) {
  const styles = createStyles(theme, isDark);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.title, { color: theme.text }]}>Cambios en Asignados</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Se modificarán los responsables de esta tarea
            </Text>
          </View>

          {/* Contenido */}
          <ScrollView style={{ maxHeight: 300, marginBottom: 20 }} showsVerticalScrollIndicator={false}>
            {/* Removidos */}
            {changeData?.removed?.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.changeLabel, { color: '#FF6B6B' }]}>Quitar acceso:</Text>
                {changeData.removed.map((email, idx) => (
                  <View key={idx} style={[styles.changeItem, { borderLeftColor: '#FF6B6B' }]}>
                    <Ionicons name="remove-circle" size={18} color="#FF6B6B" />
                    <Text style={[styles.changeEmail, { color: theme.text, marginLeft: 10 }]}>
                      {email}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Agregados */}
            {changeData?.added?.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.changeLabel, { color: '#51CF66' }]}>Agregar acceso:</Text>
                {changeData.added.map((email, idx) => (
                  <View key={idx} style={[styles.changeItem, { borderLeftColor: '#51CF66' }]}>
                    <Ionicons name="add-circle" size={18} color="#51CF66" />
                    <Text style={[styles.changeEmail, { color: theme.text, marginLeft: 10 }]}>
                      {email}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Advertencia */}
            <View style={[styles.warningBox, { backgroundColor: isDark ? '#333' : '#FFF9E6' }]}>
              <Ionicons name="information-circle" size={20} color={isDark ? '#FFA500' : '#FF9800'} />
              <Text style={[styles.warningText, { color: isDark ? '#FFB84D' : '#E65100', marginLeft: 10 }]}>
                Las personas removidas dejarán de ver esta tarea
              </Text>
            </View>
          </ScrollView>

          {/* Botones */}
          <View style={styles.buttons}>
            <GlassmorphicButton
              title="Cancelar"
              onPress={onClose}
              variant="secondary"
              size="large"
            />
            <GlassmorphicButton
              title="Confirmar Cambios"
              onPress={onConfirm}
              variant="primary"
              size="large"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (_theme, _isDark) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    container: {
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 500,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      marginTop: 4,
    },
    changeLabel: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
    },
    changeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderRadius: 8,
    },
    changeEmail: {
      fontSize: 14,
      fontWeight: '500',
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    warningText: {
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
    },
  });
