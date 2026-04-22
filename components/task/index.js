/**
 * Task Components - Exports
 * 
 * Componentes de refactorización de TaskDetailScreen
 * Divididos en 4 módulos por responsabilidad
 */

// Main form components
export { default as TaskFormBasic } from './TaskFormBasic';
export { default as TaskFormExtended } from './TaskFormExtended';
export { default as TaskMetadata } from './TaskMetadata';
export { default as TaskAssignees } from './TaskAssignees';
export { default as TaskAdvancedOptions } from './TaskAdvancedOptions';
export { default as TaskAISuggestions } from './TaskAISuggestions';

// Supporting components
export { default as TaskSubtasksSection } from './TaskSubtasksSection';
export { default as TaskHeader } from './TaskHeader';

// Existing modals (already in this folder)
export { default as ReadOnlyTaskModal } from './ReadOnlyTaskModal';
export { default as DelegateTaskModal } from './DelegateTaskModal';
export { default as AiSubtasksModal } from './AiSubtasksModal';
export { default as AssigneeChangeConfirmModal } from './AssigneeChangeConfirmModal';
