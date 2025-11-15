import type { TileScale } from '~/app/map/Canvas/Tile/Base';

export type OperationType = 'create' | 'update' | 'delete' | 'move' | 'copy';

export interface OperationOverlayProps {
  pendingOperations: Record<string, OperationType>;
  getTilePosition: (coordId: string) => { x: number; y: number } | null;
  baseHexSize?: number;
  scale: TileScale;
  canvasRef?: React.RefObject<HTMLDivElement>;
}

export interface HexagonPulseProps {
  operation: OperationType;
  width: number;
  height: number;
  className?: string;
}

export interface OperationMarkerProps {
  coordId: string;
  operation: OperationType;
  position: { x: number; y: number };
  width: number;
  height: number;
}
