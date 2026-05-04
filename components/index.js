/**
 * components/index.js
 * Barrel export — only what is imported from '../components' somewhere in the app.
 */

// Tab bar & navigation
export { default as PremiumTabBar } from './PremiumTabBar';

// Glass cards
export { default as PremiumGlassCard } from './PremiumGlassCard';
export { default as GlassmorphicCard } from './GlassCard';

// Glassmorphic components — legacy, used by screens not yet migrated to the new design system
export { default as GlassmorphicHeader } from './glass/GlassmorphicHeader';
export { default as GlassmorphicEmptyState } from './glass/GlassmorphicEmptyState';
export { default as GlassmorphicButton } from './glass/GlassmorphicButton';
export { default as GlassmorphicInput } from './glass/GlassmorphicInput';
export { default as GlassmorphicSection } from './glass/GlassmorphicSection';
export { default as GlassmorphicChip } from './glass/GlassmorphicChip';
export { default as GlassmorphicToggle } from './glass/GlassmorphicToggle';
export { default as GlassmorphicDivider } from './glass/GlassmorphicDivider';
export { default as GlassmorphicStatsCard } from './glass/GlassmorphicStatsCard';
export { default as GlassmorphicProgress } from './glass/GlassmorphicProgress';
export { default as GlassmorphicTabs } from './glass/GlassmorphicTabs';
export { default as GlassmorphicSummaryCard } from './glass/GlassmorphicSummaryCard';
export { default as GlassmorphicFilterChips } from './glass/GlassmorphicFilterChips';
export { default as GlassmorphicKanbanCard } from './glass/GlassmorphicKanbanCard';
export { default as GlassmorphicAvatar } from './glass/GlassmorphicAvatar';

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
