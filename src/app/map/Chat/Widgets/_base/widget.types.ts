/**
 * Base widget types and capability interfaces
 * These types define the composition pattern for all chat widgets
 */

export type WidgetPriority = 'info' | 'action' | 'critical';

/**
 * Base properties that all widgets share
 */
export interface BaseWidgetProps {
  /** Unique identifier for the widget instance */
  id: string;
  /** Callback when widget is closed */
  onClose?: () => void;
  /** Whether the widget is in expanded view */
  isExpanded?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: { message: string };
  /** When the widget was created */
  timestamp?: Date;
  /** Visual priority level */
  priority?: WidgetPriority;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Canvas operation capability
 * Widgets with this capability can modify map tiles
 */
export interface CanvasOperationProps {
  /** The tile being operated on */
  tile: {
    id: string;
    title: string;
    description?: string;
    coordId: string;
    content?: string;
  };
  /** Update tile data */
  onTileUpdate?: (tileId: string, updates: Record<string, unknown>) => void | Promise<void>;
  /** Delete tile */
  onTileDelete?: (tileId: string) => void | Promise<void>;
  /** Move tile to new coordinates */
  onTileMove?: (tileId: string, newCoordId: string) => void | Promise<void>;
  /** Swap two tiles */
  onTileSwap?: (tile1Id: string, tile2Id: string) => void | Promise<void>;
}

/**
 * Authentication capability
 * Widgets with this capability handle auth flows
 */
export interface AuthenticationProps {
  /** Trigger authentication */
  onAuthenticate: () => void | Promise<void>;
  /** Cancel authentication */
  onCancel?: () => void;
  /** Current auth state */
  authState?: 'unauthenticated' | 'authenticating' | 'authenticated';
}

/**
 * Confirmation capability
 * Widgets that need user confirmation
 */
export interface ConfirmationProps {
  /** Confirm action */
  onConfirm: () => void | Promise<void>;
  /** Cancel action */
  onCancel: () => void;
  /** Custom confirm button text */
  confirmText?: string;
  /** Custom cancel button text */
  cancelText?: string;
  /** Danger level for styling */
  isDangerous?: boolean;
}

/**
 * Chat interaction capability
 * For future AI-powered widgets
 */
export interface ChatInteractionProps {
  /** Send message to chat */
  onSendMessage?: (message: string) => void;
  /** Request AI suggestion */
  onRequestSuggestion?: () => void;
  /** Current conversation context */
  conversationId?: string;
}

/**
 * Widget container props
 */
export interface WidgetContainerProps extends BaseWidgetProps {
  /** Widget content */
  children: React.ReactNode;
  /** Whether this widget performs canvas operations */
  isCanvasOperation?: boolean;
}

/**
 * Helper type to combine widget capabilities
 */
export type ComposeWidgetProps<T extends BaseWidgetProps> = T;

// Example composed widget types:
export type PreviewWidgetProps = BaseWidgetProps & CanvasOperationProps & {
  mode: 'view' | 'edit';
  content: string;
  onEdit?: () => void;
  onSave?: (content: string) => void;
  onCancel?: () => void;
};

export type LoginWidgetProps = BaseWidgetProps & AuthenticationProps & {
  message?: string;
};

export type ConfirmDeleteWidgetProps = BaseWidgetProps & CanvasOperationProps & ConfirmationProps & {
  itemName: string;
};