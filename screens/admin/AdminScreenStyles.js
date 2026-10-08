// screens/admin/AdminScreenStyles.js
// Estilos de AdminScreen.js
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  root:    { flex: 1, alignItems: 'center' },
  wrapper: { flex: 1, width: '100%', alignSelf: 'center' },

  // Header

  // Tab bar
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  tabItem:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 3, position: 'relative' },
  tabLabel:     { fontSize: 11, letterSpacing: 0.2 },
  tabIndicator: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2.5, borderRadius: 2 },

  // Content
  content: { padding: 16, paddingBottom: 80 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    width: '31%', flexGrow: 1, borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 4,
    overflow: 'hidden', position: 'relative',
  },
  statAccent:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  statIconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  statNumber:   { fontSize: 28, fontWeight: '700', letterSpacing: -1, lineHeight: 32 },
  statLabel:    { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center', letterSpacing: 0.3, textTransform: 'uppercase' },

  // Group sections
  groupHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  groupCard: {
    borderRadius: 16, borderWidth: 1, marginBottom: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  actionRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  actionIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  actionText:   { flex: 1 },
  actionTitle:  { fontSize: 16, fontWeight: '600' },
  actionSub:    { fontSize: 12, marginTop: 1 },
  rowSeparator: { height: StyleSheet.hairlineWidth },

  // Info rows (Sistema tab)
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  infoLabel:     { fontSize: 16, fontWeight: '500' },
  infoValue:     { fontSize: 16 },
  statusPill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot:     { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  toggle: {
    width: 52, height: 30, borderRadius: 15, backgroundColor: 'rgba(120,120,128,0.22)', padding: 2, justifyContent: 'center',
  },
  toggleKnob: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  toggleKnobOn: { alignSelf: 'flex-end' },

  // Modals shared
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: {
    width: '100%', maxWidth: 420, maxHeight: '85%', borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12,
  },
  flowModalCard: {
    width: '100%', maxWidth: 440, flex: 1, maxHeight: '92%', borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12,
  },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle:   { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  modalSub:     { fontSize: 14, marginTop: 1 },
  urgentTask:   { padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 2 },
  modalBtn:     { padding: 15, borderRadius: 16, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Flow modal internals
  flowSection:      { borderRadius: 16, padding: 16, marginBottom: 14 },
  flowSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  roleBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  roleBoxText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  roleBoxSm:   { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, minWidth: 88 },
  roleBoxSmText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  roleBoxSmDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  stepBubble: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepNum:    { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
