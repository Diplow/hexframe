/**
 * Public API for PreviewWidget Subsystem
 * 
 * Consumers: Widget renderers, chat system
 */

// Main Preview Widget
export { PreviewWidget } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/preview-widget';

// Widget Components
export { ActionMenu } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/ActionMenu';
export { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/ContentDisplay';
export { EditControls } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/EditControls';
export { PreviewHeader } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/PreviewHeader';

// State Management
export { usePreviewState } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/usePreviewState';

/**
 * PreviewWidget Subsystem Public Interface
 * 
 * Provides comprehensive tile viewing and editing interface within
 * chat system, supporting both preview and edit modes with proper
 * state management and user controls.
 * 
 * All components and hooks are exported above for direct usage.
 */