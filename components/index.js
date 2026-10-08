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
export { default as GlassmorphicInput } from './glass/GlassmorphicInput';
export { default as GlassmorphicSection } from './glass/GlassmorphicSection';
export { default as GlassmorphicDivider } from './glass/GlassmorphicDivider';
export { default as GlassmorphicStatsCard } from './glass/GlassmorphicStatsCard';
export { default as GlassmorphicTabs } from './glass/GlassmorphicTabs';
export { default as GlassmorphicFilterChips } from './glass/GlassmorphicFilterChips';

// Task card (used by Dashboard, Search)
export { default as TaskCard } from './TaskCard';

// Advanced selectors (used by TaskDetailScreen)
export { default as PrioritySelector } from './selectors/PrioritySelector';
export { default as StatusSelector } from './selectors/StatusSelector';
export { default as AreaSelector } from './selectors/AreaSelector';
export { default as DateSelector } from './selectors/DateSelector';

// Kanban enhancements (used by KanbanScreen)
