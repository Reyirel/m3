// screens/TaskChatScreen.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
  Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getChatTask, markChatRead, notifyChatParticipants, sendMessage, subscribeToMessages,
} from '../services/chatService';
import ChatImageUpload from '../components/ChatImageUpload';
import { useHeaderPaddingTop } from '../components/ui/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { useNotification } from '../contexts/NotificationContext';
import { createStyles } from './chat/TaskChatScreenStyles';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatSeparator(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildFeed(messages, currentUserId, currentUser) {
  const result = [];
  let lastDateStr = null;
  for (const msg of messages) {
    const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : null;
    if (date) {
      const ds = date.toDateString();
      if (ds !== lastDateStr) {
        lastDateStr = ds;
        result.push({ _type: 'separator', id: 'sep_' + ds, date, label: formatSeparator(date) });
      }
    }
    const isMine = msg.authorId
      ? msg.authorId === currentUserId
      : msg.author === currentUser;
    result.push({ ...msg, _type: 'message', _isMine: isMine, _date: date });
  }
  return result;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function TaskChatScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const headerPaddingTop = useHeaderPaddingTop();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { currentUser: ctxUser, tasks: ctxTasks } = useTasks();
  const { showError } = useNotification();
  const { taskId, taskTitle } = route.params;
  const isTaskLoaded = ctxTasks.some(t => t.id === taskId);

  const [messages, setMessages]             = useState([]);
  const [text, setText]                     = useState('');
  const [hasAccess, setHasAccess]           = useState(false);
  const [taskData, setTaskData]             = useState(null);
  const [isUploadingImage] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const currentUser   = ctxUser?.displayName || ctxUser?.email || 'Usuario';
  const currentUserId = ctxUser?.userId ?? null;
  const flatRef       = useRef();

  // ── access check ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ctxUser) return;
    const { role } = ctxUser;
    const allowedRole = role === 'admin' || role === 'director' || role === 'secretario';

    // La tarea ya está en la lista en memoria (que también funciona sin conexión):
    // no hace falta leerla de Firestore, lectura que sin red deja el chat bloqueado
    const loadedTask = ctxTasks.find(t => t.id === taskId);
    if (loadedTask) {
      setTaskData(loadedTask);
      setHasAccess(allowedRole);
      return;
    }

    (async () => {
      try {
        const task = await getChatTask(taskId);
        if (task) {
          setTaskData(task);
          setHasAccess(allowedRole);
        }
      } catch (e) {
        if (__DEV__) console.error('[TaskChat] access check:', e);
        setHasAccess(false);
      }
    })();
    // ctxTasks cambia con cada actualización de la lista; basta saber si la tarea ya cargó
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxUser, taskId, isTaskLoaded]);

  // ── realtime messages ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) return;
    return subscribeToMessages(taskId, setMessages, err => {
      if (__DEV__) console.error('[TaskChat] snapshot:', err);
    });
  }, [taskId, hasAccess]);

  // Con el chat abierto, todo lo que llega cuenta como leído
  useEffect(() => {
    if (hasAccess) markChatRead(taskId, ctxUser?.email);
  }, [hasAccess, taskId, ctxUser?.email, messages.length]);

  // Guardar un mensaje. No se espera la confirmación del servidor: el mensaje aparece de
  // inmediato con el reloj de "enviando" y, si no hay conexión, sale solo al recuperarla.
  const postMessage = (message, preview) => {
    const sender = { userId: currentUserId, email: ctxUser?.email, name: currentUser || 'Usuario' };
    sendMessage(taskId, message, sender).catch(e => {
      if (__DEV__) console.error('[TaskChat] send:', e);
      showError(`No se pudo enviar el mensaje: ${e.message}`);
    });

    notifyChatParticipants(
      { ...(taskData || {}), id: taskId, title: taskTitle || taskData?.title },
      sender,
      preview,
    );

    setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 150);
  };

  // ── send text ─────────────────────────────────────────────────────────────
  const send = () => {
    if (!text.trim() || !hasAccess) return;
    const body = text.trim();
    setText('');
    postMessage({ type: 'text', text: body }, body);
  };

  // ── send image ────────────────────────────────────────────────────────────
  const handleImageCapture = (imageData) => {
    if (!hasAccess) return;
    postMessage({ type: 'image', imageUrl: imageData.uri, imageName: imageData.name }, '📷 Foto');
  };

  // En web, Enter envía y Shift+Enter hace salto de línea
  const handleKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      send();
    }
  };

  // ── feed (with date separators) ───────────────────────────────────────────
  const feed = useMemo(
    () => buildFeed(messages, currentUserId, currentUser),
    [messages, currentUserId, currentUser],
  );

  // ── render item ───────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => {
    if (item._type === 'separator') {
      return (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorLabel}>{item.label}</Text>
          <View style={styles.separatorLine} />
        </View>
      );
    }

    const isMine = item._isMine;
    const timeStr = formatTime(item._date);

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {/* Avatar circle for others */}
        {!isMine && (
          <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {(item.author || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}

        <View style={[
          styles.bubble,
          isMine ? [styles.bubbleMine, { backgroundColor: theme.primary }]
                 : [styles.bubbleOther, {
                     backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : '#FFFFFF',
                     borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                   }],
        ]}>
          {/* Author name — only on others' bubbles */}
          {!isMine && (
            <Text style={[styles.bubbleAuthor, { color: theme.primary }]}>
              {item.author || 'Usuario'}
            </Text>
          )}

          {item.type === 'image' ? (
            <TouchableOpacity accessibilityRole="imagebutton" accessibilityLabel="Ver imagen"
              onPress={() => setSelectedImageUrl(item.imageUrl)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.msgImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.bubbleText, isMine && { color: '#FFFFFF' }]}>
              {item.text || ''}
            </Text>
          )}

          <Text style={[
            styles.bubbleTime,
            isMine ? { color: 'rgba(255,255,255,0.65)' } : { color: theme.textTertiary },
          ]}>
            {timeStr}
            {/* Mis mensajes: reloj mientras no llega al servidor, palomita cuando ya llegó */}
            {isMine && (
              <Text accessibilityLabel={item._pending ? 'Enviando' : 'Enviado'}>
                {'  '}
                <Ionicons
                  name={item._pending ? 'time-outline' : 'checkmark'}
                  size={11}
                  color="rgba(255,255,255,0.75)"
                />
              </Text>
            )}
          </Text>
        </View>
      </View>
    );
  }, [styles, theme, isDark, setSelectedImageUrl]);

  // ── empty state ───────────────────────────────────────────────────────────
  const EmptyChat = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
        <Ionicons name="chatbubbles-outline" size={40} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin mensajes aún</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Sé el primero en escribir algo
      </Text>
    </View>
  );

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: 'padding' })}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
    >

      {/* Header */}
      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerBar, { paddingTop: headerPaddingTop, borderBottomColor: theme.glassBorder }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Volver"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerIconBg]}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {taskTitle || 'Chat de tarea'}
          </Text>
        </View>

        <View style={{ width: 38 }} />
      </LinearGradient>

      {!hasAccess ? (
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.textMuted} />
          <Text style={[styles.noAccessTitle, { color: theme.text }]}>Sin acceso</Text>
          <Text style={[styles.noAccessText, { color: theme.textSecondary }]}>
            No tienes permisos para ver este chat
          </Text>
        </View>
      ) : (
        <View style={styles.chatContent}>
          <FlatList
            ref={flatRef}
            data={feed}
            keyExtractor={i => i.id}
            contentContainerStyle={[
              styles.messagesContainer,
              feed.length === 0 && { flex: 1 },
            ]}
            renderItem={renderItem}
            ListEmptyComponent={<EmptyChat />}
            windowSize={10}
            maxToRenderPerBatch={10}
            initialNumToRender={15}
            removeClippedSubviews={true}
            onContentSizeChange={() => feed.length > 0 && flatRef.current?.scrollToEnd?.({ animated: false })}
          />

          {/* Composer */}
          <View style={styles.composer}>
            <ChatImageUpload onImageCapture={handleImageCapture} disabled={isUploadingImage} />

            <TextInput
              placeholder="Escribe un mensaje…"
              placeholderTextColor={theme.inputPlaceholder || '#9999A0'}
              value={text}
              onChangeText={setText}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              multiline
              maxLength={500}
              accessibilityLabel="Escribe un mensaje"
              accessibilityRole="text"
              editable={!isUploadingImage}
              onKeyPress={handleKeyPress}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: theme.primary, shadowColor: theme.primary },
                (!text.trim() || isUploadingImage) && styles.sendBtnDisabled,
              ]}
              onPress={send}
              disabled={!text.trim() || isUploadingImage}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Enviar"
              accessibilityRole="button"
            >
              <Ionicons
                name={isUploadingImage ? 'hourglass-outline' : 'send'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Full-screen image viewer */}
      <Modal
        visible={!!selectedImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <TouchableOpacity
          style={styles.imageModalContainer}
          activeOpacity={1}
          onPress={() => setSelectedImageUrl(null)}
        >
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setSelectedImageUrl(null)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.imageModalHint}>Toca fuera para cerrar</Text>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
