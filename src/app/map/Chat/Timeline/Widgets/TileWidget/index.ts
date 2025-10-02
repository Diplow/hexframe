/**
 * Public API for TileWidget Subsystem
 *
 * Consumers: Widget renderers, chat system
 */

// Main Tile Widget
export { TileWidget } from '~/app/map/Chat/Timeline/Widgets/TileWidget/tile-widget';

// Widget Components
export { ActionMenu } from '~/app/map/Chat/Timeline/Widgets/TileWidget/ActionMenu';
export { ContentDisplay } from '~/app/map/Chat/Timeline/Widgets/TileWidget/ContentDisplay';
export { TileHeader } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileHeader';
export { TileForm } from '~/app/map/Chat/Timeline/Widgets/TileWidget/TileForm';

// State Management
export { useTileState } from '~/app/map/Chat/Timeline/Widgets/TileWidget/useTileState';

/**
 * TileWidget Subsystem Public Interface
 *
 * Provides comprehensive tile viewing and editing interface within
 * chat system, supporting both preview and edit modes with proper
 * state management and user controls.
 *
 * All components and hooks are exported above for direct usage.
 */