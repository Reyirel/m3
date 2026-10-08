// screens/dashboard/AdminExecutiveDashboardStyles.js
// Estilos de AdminExecutiveDashboard.js
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1, alignSelf: 'center', width: '100%' },
  
  // Header
  header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.72)', letterSpacing: 0.3, fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 4, letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.20)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  headerBadgeText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerBadgeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  
  // Tabs
  tabsContainer: { borderBottomWidth: 1, paddingVertical: 10 },
  tabsScroll: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, justifyContent: 'space-around' },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: 'transparent', gap: 6 },
  tabLabel: { fontSize: 14, fontWeight: '600' },

  // Compact comparison (inline in overview card)
  compactComparison: { borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compactCompLabel: { fontSize: 12 },
  compactCompValue: { fontSize: 22, fontWeight: '700' },
  compactCompSep: { fontSize: 12 },
  compactBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },

  // Evolution button (in overview)
  evolutionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 16 },

  // Segment toggle (compliance tab)
  segmentToggle: { flexDirection: 'row', borderRadius: 16, padding: 3, gap: 3 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  segmentBtnText: { fontSize: 14, fontWeight: '600' },
  
  // Content
  scrollContent: { padding: 16 },
  section: { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  
  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { width: '47%', flexGrow: 1, padding: 14, borderRadius: 16, alignItems: 'center' },
  kpiValue: { fontSize: 28, fontWeight: '700' },
  kpiLabel: { fontSize: 12, marginTop: 3, textAlign: 'center', fontWeight: '500' },
  
  // Rates
  ratesContainer: { gap: 12 },
  rateItem: { gap: 6 },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateLabel: { fontSize: 14, fontWeight: '500' },
  rateValue: { fontSize: 16, fontWeight: '700' },
  
  // Comparison
  
  // Chart
  chartContainer: { alignItems: 'center', marginVertical: 10 },
  emptyChart: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyChartText: { fontSize: 14, textAlign: 'center' },
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  periodButtonText: { fontSize: 12, fontWeight: '600' },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  
  // Compliance
  complianceSummary: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  complianceCard: { flex: 1, padding: 12, borderRadius: 16, alignItems: 'center' },
  complianceValue: { fontSize: 22, fontWeight: '700' },
  complianceLabel: { fontSize: 11, marginTop: 2 },
  
  // Users List
  usersList: { gap: 10 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderLeftWidth: 4, gap: 10 },
  rankNumber: { fontSize: 12, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600' },
  userRole: { fontSize: 12, marginTop: 2 },
  userStats: { alignItems: 'flex-end' },
  userRate: { fontSize: 18, fontWeight: '700' },
  overdueText: { fontSize: 11, fontWeight: '600' },
  
  // Secretaria Cards
  secretariaCard: { padding: 14, borderRadius: 16, marginBottom: 12, borderLeftWidth: 4 },
  secretariaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  secretariaInfo: { flex: 1, marginLeft: 10 },
  secretariaName: { fontSize: 16, fontWeight: '700' },
  secretariaArea: { fontSize: 12, marginTop: 2 },
  scoreValue: { fontSize: 22, fontWeight: '700' },
  secretariaStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  
  // Empty
  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalUserInfo: { alignItems: 'center', marginBottom: 16 },
  modalUserName: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  modalUserRole: { fontSize: 14, marginTop: 4 },
  modalStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modalStatCard: { flex: 1, padding: 12, borderRadius: 16, alignItems: 'center' },
  modalStatValue: { fontSize: 22, fontWeight: '700' },
  modalStatLabel: { fontSize: 11, marginTop: 4 },
  modalCompletion: { marginBottom: 16 },
  modalCompletionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalCompletionLabel: { fontSize: 14 },
  modalCompletionValue: { fontSize: 18, fontWeight: '700' },
  modalDirectors: { marginTop: 8 },
  modalDirectorsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  modalDirectorItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 6, gap: 10 },
  modalDirectorName: { fontSize: 14, fontWeight: '500' },
});
