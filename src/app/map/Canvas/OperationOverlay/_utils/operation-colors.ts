import type { OperationType } from '~/app/map/Canvas/OperationOverlay/types';

export interface OperationColorScheme {
  stroke: string;
  fill: string;
  glow: string;
}

/**
 * Get color scheme for operation type
 */
export function getOperationColors(operation: OperationType): OperationColorScheme {
  switch (operation) {
    case 'create':
      return {
        stroke: 'rgb(34, 197, 94)', // green-500
        fill: 'rgba(34, 197, 94, 0.1)',
        glow: 'rgba(34, 197, 94, 0.3)',
      };
    case 'update':
      return {
        stroke: 'rgb(245, 158, 11)', // amber-500
        fill: 'rgba(245, 158, 11, 0.1)',
        glow: 'rgba(245, 158, 11, 0.3)',
      };
    case 'delete':
      return {
        stroke: 'rgb(239, 68, 68)', // red-500
        fill: 'rgba(239, 68, 68, 0.1)',
        glow: 'rgba(239, 68, 68, 0.3)',
      };
    case 'move':
    case 'copy':
    case 'swap':
      return {
        stroke: 'rgb(168, 85, 247)', // purple-500
        fill: 'rgba(168, 85, 247, 0.1)',
        glow: 'rgba(168, 85, 247, 0.3)',
      };
  }
}

/**
 * Get dark mode colors for operation
 */
export function getDarkModeOperationColors(operation: OperationType): OperationColorScheme {
  // Slightly brighter colors for dark mode visibility
  switch (operation) {
    case 'create':
      return {
        stroke: 'rgb(74, 222, 128)', // green-400
        fill: 'rgba(74, 222, 128, 0.15)',
        glow: 'rgba(74, 222, 128, 0.4)',
      };
    case 'update':
      return {
        stroke: 'rgb(251, 191, 36)', // amber-400
        fill: 'rgba(251, 191, 36, 0.15)',
        glow: 'rgba(251, 191, 36, 0.4)',
      };
    case 'delete':
      return {
        stroke: 'rgb(248, 113, 113)', // red-400
        fill: 'rgba(248, 113, 113, 0.15)',
        glow: 'rgba(248, 113, 113, 0.4)',
      };
    case 'move':
    case 'copy':
    case 'swap':
      return {
        stroke: 'rgb(192, 132, 252)', // purple-400
        fill: 'rgba(192, 132, 252, 0.15)',
        glow: 'rgba(192, 132, 252, 0.4)',
      };
  }
}
