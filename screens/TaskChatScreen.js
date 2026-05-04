// screens/TaskChatScreen.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  Image, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  doc, getDoc, updateDoc,
} from 'firebase/firestore';
import { db, getServerTimestamp } from '../firebase';
import { notifyNewComment } from '../services/fcm';
import { notifyNewChatMessage } from '../services/emailNotifications';
import ChatImageUpload from '../components/ChatImageUpload';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';

const { width: SCREEN_W } = Dimensions.get('window');
const BUBBLE_MAX = SCREEN_W * 0.72;

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
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { currentUser: ctxUser } = useTasks();
  const { taskId, taskTitle } = route.params;

  const [messages, setMessages]             = useState([]);
  const [text, setText]                     = useState('');
  const [hasAccess, setHasAccess]           = useState(false);
  const [taskData, setTaskData]             = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const currentUser   = ctxUser?.displayName || ctxUser?.email || 'Usuario';
  const currentUserId = ctxUser?.userId ?? null;
  const flatRef       = useRef();

  // ── access check ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ctxUser) return;
    (async () => {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
          setTaskData(taskDoc.data());
          const { role } = ctxUser;
          setHasAccess(role === 'admin' || role === 'director' || role === 'secretario');
        }
      } catch (e) {
        if (__DEV__) console.error('[TaskChat] access check:', e);
        setHasAccess(false);
      }
    })();
  }, [ctxUser, taskId]);

  // ── realtime messages ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) return;
    const q = query(collection(db, 'tasks', taskId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      if (__DEV__) console.error('[TaskChat] snapshot:', err);
    });
  }, [taskId, hasAccess]);

  // ── send text ─────────────────────────────────────────────────────────────
  const send = async () => {
    if (!text.trim() || !hasAccess) return;
    const body = text.trim();
    setText('');
    try {
      await addDoc(collection(db, 'tasks', taskId, 'messages'), {
        type: 'text',
        text: body,
        author:   currentUser || 'Usuario',
        authorId: currentUserId,
        createdAt: getServerTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          lastMessageAt: getServerTimestamp(),
          lastMessageBy: currentUser || 'Usuario',
          hasUnreadMessages: true,
        });
      } catch {}
      try {
        await notifyNewComment(taskId, currentUser || 'Usuario', body);
        if (taskData?.assignedTo && taskData.assignedTo !== currentUserId) {
          await notifyNewChatMessage(
            { id: taskId, title: taskTitle || taskData.title },
            { author: currentUser, text: body },
            taskData.assignedTo,
          );
        }
      } catch {}
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 150);
    } catch (e) {
      if (__DEV__) console.error('[TaskChat] send:', e);
      Alert.alert('Error', `No se pudo enviar el mensaje: ${e.message}`);
    }
  };

  // ── send image ────────────────────────────────────────────────────────────
  const handleImageCapture = async (imageData) => {
    if (!hasAccess) return;
    setIsUploadingImage(true);
    try {
      await addDoc(collection(db, 'tasks', taskId, 'messages'), {
        type: 'image',
        imageUrl:  imageData.uri,
        imageName: imageData.name,
        author:    currentUser || 'Usuario',
        authorId:  currentUserId,
        createdAt: getServerTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          lastMessageAt: getServerTimestamp(),
          lastMessageBy: currentUser || 'Usuario',
          hasUnreadMessages: true,
        });
      } catch {}
      try { await notifyNewComment(taskId, currentUser || 'Usuario', '[Imagen enviada]'); } catch {}
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 150);
    } catch (e) {
      if (__DEV__) console.error('[TaskChat] image:', e);
      Alert.alert('Error', `No se pudo enviar la imagen: ${e.message}`);
    } finally {
      setIsUploadingImage(false);
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
            <TouchableOpacity
              onPress={() => setSelectedImageUrl(item.imageUrl)}
              activeOpacity={0.9}
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
        style={[styles.headerBar, { shadowColor: theme.primary }]}
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
              onSubmitEditing={Platform.OS === 'web' ? send : undefined}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: theme.primary, shadowColor: theme.primary },
                (!text.trim() || isUploadingImage) && styles.sendBtnDisabled,
              ]}
              onPress={send}
              disabled={!text.trim() || isUploadingImage}
              activeOpacity={0.75}
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

const createStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  headerIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    flexShrink: 1,
  },

  // Chat body
  chatContent: {
    flex: 1,
    flexDirection: 'column',
  },
  messagesContainer: {
    padding: 12,
    paddingBottom: 4,
  },

  // Date separator
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  separatorLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
  },
  separatorLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)',
    textTransform: 'uppercase',
  },

  // Message rows
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },

  // Avatar
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Bubbles
  bubble: {
    maxWidth: BUBBLE_MAX,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleMine: {
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    borderTopLeftRadius: 5,
    borderWidth: 1,
  },
  bubbleAuthor: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: theme.text,
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'right',
  },

  // Images inside bubbles
  msgImage: {
    width: 200,
    height: 160,
    borderRadius: 12,
    marginBottom: 4,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius: 10,
    padding: 5,
  },

  // Composer bar
  composer: {
    flexDirection: 'row',
    padding: 10,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.90)',
    borderTopWidth: 0.5,
    borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.08)',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7',
    borderRadius: 20,
    fontSize: 15,
    fontWeight: '400',
    borderWidth: 1,
    maxHeight: 100,
    minHeight: 42,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },

  // No access
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  noAccessTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 8,
  },
  noAccessText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Full-screen image
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: SCREEN_W - 32,
    height: Dimensions.get('window').height * 0.70,
    borderRadius: 12,
  },
  imageModalHint: {
    position: 'absolute',
    bottom: 50,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
  },
});
