/**
 * components/index.js
 * Barrel export — only what is imported from '../components' somewhere in the app.
 */

// Tab bar & navigation
export { default as PremiumTabBar } from './PremiumTabBar';

// Glass cards
export { default as PremiumGlassCard } from './PremiumGlassCard';
export { default as GlassmorphicCard } from './GlassCard';

// Glassmorphic components — used by screens not yet migrated to the new design system
export { default as GlassmorphicHeader } from './GlassmorphicHeader';
export { default as GlassmorphicEmptyState } from './GlassmorphicEmptyState';
export { default as GlassmorphicButton } from './GlassmorphicButton';
export { default as GlassmorphicInput } from './GlassmorphicInput';
export { default as GlassmorphicSection } from './GlassmorphicSection';
export { default as GlassmorphicChip } from './GlassmorphicChip';
export { default as GlassmorphicToggle } from './GlassmorphicToggle';
export { default as GlassmorphicDivider } from './GlassmorphicDivider';
export { default as GlassmorphicStatsCard } from './GlassmorphicStatsCard';
export { default as GlassmorphicProgress } from './GlassmorphicProgress';
export { default as GlassmorphicTabs } from './GlassmorphicTabs';
export { default as GlassmorphicSummaryCard } from './GlassmorphicSummaryCard';
export { default as GlassmorphicFilterChips } from './GlassmorphicFilterChips';
export { default as GlassmorphicKanbanCard } from './GlassmorphicKanbanCard';
export { default as GlassmorphicAvatar } from './GlassmorphicAvatar';

// Task card (used by Dashboard, Search)
export { default as TaskCard } from './TaskCard';

// Advanced selectors (used by TaskDetailScreen)
export { default as PrioritySelector } from './selectors/PrioritySelector';
export { default as StatusSelector } from './selectors/StatusSelector';
export { default as AreaSelector } from './selectors/AreaSelector';
export { default as AssigneeSelector } from './selectors/AssigneeSelector';
export { default as DateSelector } from './selectors/DateSelector';

// Kanban enhancements (used by KanbanScreen)
export { KanbanQuickStats, KanbanQuickFilters, KanbanStatsPanel } from './KanbanScreenEnhancements';
