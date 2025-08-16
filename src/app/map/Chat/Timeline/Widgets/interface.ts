/**
 * Public API for Chat Widgets Subsystem
 * 
 * Consumers: Messages subsystem, widget renderers
 */

// Core Widget Components
export { PreviewWidget } from './PreviewWidget';
export { CreationWidget } from './CreationWidget';
export { LoginWidget } from './LoginWidget';
export { ConfirmDeleteWidget } from './ConfirmDeleteWidget';
export { ErrorWidget } from './ErrorWidget';
export { LoadingWidget } from './LoadingWidget';
export { AIResponseWidget } from './AIResponseWidget';

// Widget Infrastructure
export { Portal } from './Portal';

// Preview Widget Components (re-exported from their subsystem)
export * from './PreviewWidget/interface';

// Login Widget Components (re-exported from their subsystem)
export * from './LoginWidget/interface';

// AI Response Widget Components (re-exported from their subsystem)
export * from './AIResponseWidget/interface';

/**
 * Chat Widgets Subsystem Public Interface
 * 
 * Provides interactive UI components for complex user operations
 * within the chat interface. Widgets handle multi-step interactions,
 * form input, and structured user flows.
 * 
 * All components are exported above for direct usage.
 */