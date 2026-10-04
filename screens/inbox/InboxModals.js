// screens/inbox/InboxModals.js
// Ventanas de la bandeja: guía de uso y mensajes recientes.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toMs } from '../../utils/dateUtils';

const helpItems = (theme) => [
  {
    icon: 'arrow-forward',
    color: theme.secondary,
    title: 'Confirmar participación',
    text: 'Acepta tu parte de la tarea cuando hay múltiples asignados',
  },
  {
    icon: 'checkmark',
    color: theme.success,
    title: 'Cerrar tarea',
    text: 'Marca la tarea como completada (requiere confirmación)',
  },
  {
    icon: 'chatbubble',
    color: theme.info,
    title: 'Chat de tarea',
    text: 'Abre la conversación de la tarea para comunicarte con el equipo',
  },
  {
    icon: 'warning',
    color: theme.warning,
    title: 'Alerta de riesgo (IA)',
    text: 'Las tareas con "Riesgo alto" o "Riesgo medio" tienen mayor probabilidad de retrasarse según el historial del área',
  },
  {
    icon: 'options',
    color: theme.primary,
    title: 'Filtros avanzados',
    text: 'Usa el botón ⊞ en la barra de búsqueda para filtrar por estado, prioridad, área y vencidas',
  },
];

export function HelpModal({ visible, onClose, styles, theme }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.helpModalContent, { backgroundColor: theme.card }]}>
          <View style={styles.helpModalHeader}>
            <Ionicons name="help-circle" size={32} color={theme.primary} />
            <Text style={[styles.helpModalTitle, { color: theme.text }]}>Guía de Mi Bandeja</Text>
          </View>

          {helpItems(theme).map((item) => (
            <View key={item.title} style={styles.helpModalItem}>
              <View style={[styles.helpModalIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={18} color="#FFFFFF" />
              </View>
              <View style={styles.helpModalTextContainer}>
                <Text style={[styles.helpModalItemTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.helpModalItemDesc, { color: theme.textSecondary }]}>{item.text}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={[styles.helpModalCloseBtn, { backgroundColor: theme.primary }]} onPress={onClose}>
            <Text style={styles.helpModalCloseBtnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const messageTime = (createdAt) => {
  try {
    const date = createdAt?.toDate
      ? new Date(createdAt.toDate())
      : createdAt?.seconds ? new Date(toMs(createdAt)) : null;
    if (!date) return 'Reciente';
    return date.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Reciente';
  }
};

export function MessagesModal({ visible, onClose, messages, onOpenMessage, styles, theme, isDark }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="chatbubbles" size={24} color="#DAA520" style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: theme.text }]}>Mensajes Recientes</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons name="close-circle" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {messages.map((message, index) => (
              <TouchableOpacity
                key={`msg-${message.taskId}-${message.id}-${index}`}
                style={[styles.messageCard, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#F5DEB3',
                }]}
                onPress={() => onOpenMessage(message)}
              >
                <View style={styles.messageHeader}>
                  <Ionicons name="document-text-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.messageTaskTitle, { color: theme.text }]} numberOfLines={1}>
                    {message.taskTitle || 'Sin título'}
                  </Text>
                </View>
                <Text style={[styles.messageAuthor, { color: theme.primary }]}>{message.author || 'Anónimo'}</Text>
                <Text style={[styles.messageText, { color: theme.textSecondary }]} numberOfLines={2}>
                  {message.text || ''}
                </Text>
                <Text style={[styles.messageTime, { color: theme.textTertiary }]}>{messageTime(message.createdAt)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
