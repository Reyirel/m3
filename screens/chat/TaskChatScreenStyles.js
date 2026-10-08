// screens/chat/TaskChatScreenStyles.js
// Estilos de TaskChatScreen.js
import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const BUBBLE_MAX = SCREEN_W * 0.72;

export const createStyles = (theme, isDark) => StyleSheet.create({
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
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '700',
  },

  // Bubbles
  bubble: {
    maxWidth: BUBBLE_MAX,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
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
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
    color: theme.text,
  },
  bubbleTime: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'right',
  },

  // Images inside bubbles
  msgImage: {
    width: 200,
    height: 160,
    borderRadius: 10,
    marginBottom: 4,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 5,
  },

  // Composer bar
  composer: {
    flexDirection: 'row',
    padding: 10,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    backgroundColor: theme.glass,
    borderTopWidth: 0.5,
    borderColor: theme.glassBorder,
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
    borderRadius: 24,
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: 8,
  },
  noAccessText: {
    fontSize: 16,
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
    borderRadius: 24,
    padding: 8,
  },
  fullScreenImage: {
    width: SCREEN_W - 32,
    height: Dimensions.get('window').height * 0.70,
    borderRadius: 16,
  },
  imageModalHint: {
    position: 'absolute',
    bottom: 50,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '500',
  },
});
