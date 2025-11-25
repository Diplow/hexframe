import { z } from 'zod';

// Base event schema
const baseEventSchema = z.object({
  type: z.string(),
  source: z.enum(['map_cache', 'chat_cache', 'auth', 'sync', 'test', 'debug-logger', 'canvas']),
  timestamp: z.date().optional(),
});

// Map event payloads
const mapTileSelectedPayloadSchema = z.object({
  tileId: z.string(),
  tileData: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    coordId: z.string(),
  }),
  openInEditMode: z.boolean().optional(),
});

const mapTileCreatedPayloadSchema = z.object({
  tileId: z.string(),
  tileName: z.string(),
  coordId: z.string(),
  parentId: z.string().optional(),
});

const mapTileUpdatedPayloadSchema = z.object({
  tileId: z.string(),
  tileName: z.string(),
  coordId: z.string(),
  changes: z.record(z.unknown()),
});

const mapTileDeletedPayloadSchema = z.object({
  tileId: z.string(),
  tileName: z.string(),
  coordId: z.string(),
});

const mapTilesSwappedPayloadSchema = z.object({
  tile1Id: z.string(),
  tile2Id: z.string(),
  tile1Name: z.string(),
  tile2Name: z.string(),
});

const mapTileMovedPayloadSchema = z.object({
  tileId: z.string(),
  tileName: z.string(),
  fromCoordId: z.string(),
  toCoordId: z.string(),
});

const mapItemCopiedPayloadSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  destinationId: z.string(),
  fromCoordId: z.string(),
  toCoordId: z.string(),
});

const mapChildrenDeletedPayloadSchema = z.object({
  parentId: z.string(),
  parentName: z.string(),
  coordId: z.string(),
  directionType: z.enum(['structural', 'composed', 'executionHistory']),
  deletedCount: z.number(),
});

const mapOperationStartedPayloadSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'move', 'swap', 'copy']),
  tileId: z.string().optional(),
  tileName: z.string().optional(),
});

const mapNavigationPayloadSchema = z.object({
  fromCenterId: z.string().optional(),
  fromCenterName: z.string().optional(),
  toCenterId: z.string(),
  toCenterName: z.string(),
});

const mapExpansionChangedPayloadSchema = z.object({
  tileId: z.string(),
  tileName: z.string(),
  expanded: z.boolean(),
});

const mapImportCompletedPayloadSchema = z.object({
  importedTiles: z.array(z.object({
    tileId: z.string(),
    tileName: z.string(),
    coordId: z.string(),
  })),
  rootCoordId: z.string(),
});

// Chat event payloads
const chatMessagePayloadSchema = z.object({
  message: z.string(),
  actor: z.enum(['user', 'system', 'assistant']),
});

const chatWidgetPayloadSchema = z.object({
  widgetType: z.string(),
  widgetId: z.string(),
});

// Auth event payloads
const authStateChangedPayloadSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
});

const authRequiredPayloadSchema = z.object({
  reason: z.string(),
  requiredFor: z.string().optional(),
});

// Error event payloads
const errorOccurredPayloadSchema = z.object({
  error: z.string(),
  context: z.unknown().optional(),
  retryable: z.boolean().optional(),
});

// Request event payloads (Canvas -> Chat)
const mapEditRequestedPayloadSchema = z.object({
  tileId: z.string(),
  tileData: z.object({
    title: z.string(),
    content: z.string().optional(),
    coordId: z.string(),
  }),
  openInEditMode: z.literal(true),
});

const mapDeleteRequestedPayloadSchema = z.object({
  tileId: z.string(),
  tileName: z.string(),
});

const mapDeleteChildrenRequestedPayloadSchema = z.object({
  tileId: z.string(),
  tileName: z.string(),
  directionType: z.enum(['structural', 'composed', 'executionHistory']),
});

const mapCreateRequestedPayloadSchema = z.object({
  coordId: z.string(),
  parentName: z.string().optional(),
  parentId: z.string().optional(),
  parentCoordId: z.string().optional(),
});

// Specific event schemas
export const mapTileSelectedEventSchema = baseEventSchema.extend({
  type: z.literal('map.tile_selected'),
  source: z.literal('map_cache'),
  payload: mapTileSelectedPayloadSchema,
});

export const mapTileCreatedEventSchema = baseEventSchema.extend({
  type: z.literal('map.tile_created'),
  source: z.literal('map_cache'),
  payload: mapTileCreatedPayloadSchema,
});

export const mapTileUpdatedEventSchema = baseEventSchema.extend({
  type: z.literal('map.tile_updated'),
  source: z.literal('map_cache'),
  payload: mapTileUpdatedPayloadSchema,
});

export const mapTileDeletedEventSchema = baseEventSchema.extend({
  type: z.literal('map.tile_deleted'),
  source: z.literal('map_cache'),
  payload: mapTileDeletedPayloadSchema,
});

export const mapTilesSwappedEventSchema = baseEventSchema.extend({
  type: z.literal('map.tiles_swapped'),
  source: z.literal('map_cache'),
  payload: mapTilesSwappedPayloadSchema,
});

export const mapTileMovedEventSchema = baseEventSchema.extend({
  type: z.literal('map.tile_moved'),
  source: z.literal('map_cache'),
  payload: mapTileMovedPayloadSchema,
});

export const mapItemCopiedEventSchema = baseEventSchema.extend({
  type: z.literal('map.item_copied'),
  source: z.literal('map_cache'),
  payload: mapItemCopiedPayloadSchema,
});

export const mapChildrenDeletedEventSchema = baseEventSchema.extend({
  type: z.literal('map.children_deleted'),
  source: z.literal('map_cache'),
  payload: mapChildrenDeletedPayloadSchema,
});

export const mapOperationStartedEventSchema = baseEventSchema.extend({
  type: z.literal('map.operation_started'),
  source: z.literal('map_cache'),
  payload: mapOperationStartedPayloadSchema,
});

export const mapNavigationEventSchema = baseEventSchema.extend({
  type: z.literal('map.navigation'),
  source: z.literal('map_cache'),
  payload: mapNavigationPayloadSchema,
});

export const mapExpansionChangedEventSchema = baseEventSchema.extend({
  type: z.literal('map.expansion_changed'),
  source: z.literal('map_cache'),
  payload: mapExpansionChangedPayloadSchema,
});

export const mapImportCompletedEventSchema = baseEventSchema.extend({
  type: z.literal('map.import_completed'),
  source: z.literal('map_cache'),
  payload: mapImportCompletedPayloadSchema,
});

export const chatMessageSentEventSchema = baseEventSchema.extend({
  type: z.literal('chat.message_sent'),
  source: z.literal('chat_cache'),
  payload: chatMessagePayloadSchema,
});

export const chatMessageReceivedEventSchema = baseEventSchema.extend({
  type: z.literal('chat.message_received'),
  source: z.literal('chat_cache'),
  payload: chatMessagePayloadSchema,
});

export const chatWidgetOpenedEventSchema = baseEventSchema.extend({
  type: z.literal('chat.widget_opened'),
  source: z.literal('chat_cache'),
  payload: chatWidgetPayloadSchema,
});

export const chatWidgetClosedEventSchema = baseEventSchema.extend({
  type: z.literal('chat.widget_closed'),
  source: z.literal('chat_cache'),
  payload: chatWidgetPayloadSchema,
});

export const authLoginEventSchema = baseEventSchema.extend({
  type: z.literal('auth.login'),
  source: z.literal('auth'),
  payload: authStateChangedPayloadSchema,
});

export const authLogoutEventSchema = baseEventSchema.extend({
  type: z.literal('auth.logout'),
  source: z.literal('auth'),
  payload: z.object({}), // Empty payload
});

export const authRequiredEventSchema = baseEventSchema.extend({
  type: z.literal('auth.required'),
  source: z.enum(['map_cache', 'chat_cache', 'sync', 'auth']),
  payload: authRequiredPayloadSchema,
});

export const errorOccurredEventSchema = baseEventSchema.extend({
  type: z.literal('error.occurred'),
  source: z.enum(['map_cache', 'chat_cache', 'auth', 'sync']),
  payload: errorOccurredPayloadSchema,
});

// Request event schemas (Canvas -> Chat UI coordination)
export const mapEditRequestedEventSchema = baseEventSchema.extend({
  type: z.literal('map.edit_requested'),
  source: z.literal('canvas'),
  payload: mapEditRequestedPayloadSchema,
});

export const mapDeleteRequestedEventSchema = baseEventSchema.extend({
  type: z.literal('map.delete_requested'),
  source: z.enum(['canvas', 'chat_cache']), // Allow both canvas and chat_cache
  payload: mapDeleteRequestedPayloadSchema,
});

export const mapDeleteChildrenRequestedEventSchema = baseEventSchema.extend({
  type: z.literal('map.delete_children_requested'),
  source: z.enum(['canvas', 'chat_cache']),
  payload: mapDeleteChildrenRequestedPayloadSchema,
});

export const mapCreateRequestedEventSchema = baseEventSchema.extend({
  type: z.literal('map.create_requested'),
  source: z.literal('canvas'),
  payload: mapCreateRequestedPayloadSchema,
});

// Union of all event schemas for validation
export const appEventSchema = z.discriminatedUnion('type', [
  // Notification events
  mapTileSelectedEventSchema,
  mapOperationStartedEventSchema,
  mapTileCreatedEventSchema,
  mapTileUpdatedEventSchema,
  mapTileDeletedEventSchema,
  mapChildrenDeletedEventSchema,
  mapTilesSwappedEventSchema,
  mapTileMovedEventSchema,
  mapItemCopiedEventSchema,
  mapNavigationEventSchema,
  mapExpansionChangedEventSchema,
  mapImportCompletedEventSchema,
  chatMessageSentEventSchema,
  chatMessageReceivedEventSchema,
  chatWidgetOpenedEventSchema,
  chatWidgetClosedEventSchema,
  authLoginEventSchema,
  authLogoutEventSchema,
  authRequiredEventSchema,
  errorOccurredEventSchema,
  // Request events
  mapEditRequestedEventSchema,
  mapDeleteRequestedEventSchema,
  mapDeleteChildrenRequestedEventSchema,
  mapCreateRequestedEventSchema,
]);

// Helper function to validate events
export function validateEvent(event: unknown): z.infer<typeof appEventSchema> {
  return appEventSchema.parse(event);
}

// Helper function for safe validation (returns result object)
export function safeValidateEvent(event: unknown) {
  return appEventSchema.safeParse(event);
}