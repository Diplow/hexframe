// Public exports
export { OperationOverlay } from '~/app/map/Canvas/OperationOverlay/OperationOverlay';
export type { OperationOverlayProps, OperationType } from '~/app/map/Canvas/OperationOverlay/types';

// Utility exports (optional - for advanced usage)
export { generateHexagonPath, getHexagonViewBox } from '~/app/map/Canvas/OperationOverlay/_utils/hexagon-path';
export {
  getOperationColors,
  getDarkModeOperationColors,
  type OperationColorScheme,
} from '~/app/map/Canvas/OperationOverlay/_utils/operation-colors';
