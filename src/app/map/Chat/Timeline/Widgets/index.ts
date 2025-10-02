/**
 * Public API for Chat Widgets Subsystem
 * 
 * Consumers: Messages subsystem, widget renderers
 */

// Core Widget Components
export { TileWidget } from '~/app/map/Chat/Timeline/Widgets/TileWidget';
export { LoginWidget } from '~/app/map/Chat/Timeline/Widgets/LoginWidget';
export { ErrorWidget } from '~/app/map/Chat/Timeline/Widgets/ErrorWidget';
export { LoadingWidget } from '~/app/map/Chat/Timeline/Widgets/LoadingWidget';
export { AIResponseWidget } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget';
export { McpKeysWidget } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/McpKeysWidget';
export { DebugLogsWidget } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget';

// Widget Infrastructure
export { Portal } from '~/app/map/Chat/Timeline/Widgets/Portal';

// Tile Widget Components (re-exported from their subsystem)
export * from '~/app/map/Chat/Timeline/Widgets/TileWidget';

// Login Widget Components (re-exported from their subsystem)
export * from '~/app/map/Chat/Timeline/Widgets/LoginWidget';

// AI Response Widget Components (re-exported from their subsystem)
export * from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget';

/**
 * Chat Widgets Subsystem Public Interface
 * 
 * Provides interactive UI components for complex user operations
 * within the chat interface. Widgets handle multi-step interactions,
 * form input, and structured user flows.
 * 
 * All components are exported above for direct usage.
 */