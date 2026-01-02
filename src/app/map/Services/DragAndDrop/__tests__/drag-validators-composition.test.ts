import { describe, it, expect } from 'vitest';
import {
  canDragTile,
  canDropOnTile,
  validateDragOperation,
} from '~/app/map/Services/DragAndDrop/_validators/drag-validators';
import type { TileData } from '~/app/map/types';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import { Visibility, MapItemType } from '~/lib/domains/mapping/utils';

/**
 * Test suite for drag-and-drop composition detection with negative directions
 *
 * The composition model uses negative directions (-1 to -6) to represent
 * composed children that are logically "inside" a parent tile.
 *
 * This test suite ensures drag operations correctly handle:
 * 1. Detecting composed children (negative directions in path)
 * 2. Allowing drag operations on parent tiles with composition
 * 3. Preventing invalid operations on composed children
 */

// Helper to create mock tile data
function createMockTile(coordId: string, ownerId: string, overrides?: Partial<TileData>): TileData {
  const coord = CoordSystem.parseId(coordId);

  return {
    metadata: {
      dbId: `${coordId}-id`,
      coordId,
      parentId: coord.path.length > 0 ? CoordSystem.createId(CoordSystem.getParentCoord(coord)!) : undefined,
      coordinates: coord,
      depth: coord.path.length,
      ownerId,
    },
    data: {
      title: `Tile ${coordId}`,
      content: 'Test content',
      preview: 'Test preview',
      link: '',
      color: 'amber-500',
      visibility: Visibility.PRIVATE, itemType: MapItemType.CONTEXT,
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
      canExpand: true,
      canEdit: true,
    },
    ...overrides,
  };
}

describe('Drag Validators - Composition Detection (Negative Directions)', () => {
  const userId = "user-test-1";

  describe('canDragTile - composed children detection', () => {
    it('should allow dragging parent tile that has composed children', () => {
      // Parent tile at 1,0:2 with composed children
      const parentCoordId = '1,0:2';
      const parentTile = createMockTile(parentCoordId, userId.toString());

      // Parent should be draggable even if it has composed children
      const result = canDragTile(parentTile, userId);

      expect(result).toBe(true);
    });

    it('should allow dragging composed child tile (negative direction)', () => {
      // Composed child at 1,0:2,-1 (ComposedNorthWest)
      const composedChildCoordId = '1,0:2,-1';
      const composedChildTile = createMockTile(composedChildCoordId, userId.toString());

      // Composed children should be draggable if user owns them
      const result = canDragTile(composedChildTile, userId);

      expect(result).toBe(true);
    });

    it('should prevent dragging composed child not owned by user', () => {
      // Composed child owned by different user
      const composedChildCoordId = '1,0:2,-2';
      const composedChildTile = createMockTile(composedChildCoordId, '999');

      const result = canDragTile(composedChildTile, userId);

      expect(result).toBe(false);
    });

    it('should handle multiple negative directions in path', () => {
      // Deep composed child at 1,0:2,3,-1 (structural child with composition)
      const deepComposedCoordId = '1,0:2,3,-1';
      const deepComposedTile = createMockTile(deepComposedCoordId, userId.toString());

      const result = canDragTile(deepComposedTile, userId);

      expect(result).toBe(true);
    });

    it('should handle all composed direction values (-1 through -6)', () => {
      // Test all negative direction values
      const composedDirections = [-1, -2, -3, -4, -5, -6];

      composedDirections.forEach((direction) => {
        const coordId = `1,0:2,${direction}`;
        const tile = createMockTile(coordId, userId.toString());

        const result = canDragTile(tile, userId);

        expect(result).toBe(true);
      });
    });
  });

  describe('canDropOnTile - composition target validation', () => {
    it('should allow dropping on empty position that could have composed siblings', () => {
      // Source tile
      const sourceTile = createMockTile('1,0:2', userId.toString());

      // Target is empty position where parent has composed children
      const targetCoordId = '1,0:3';
      const targetTile = null;

      const result = canDropOnTile(sourceTile, targetTile, targetCoordId, userId);

      expect(result).toBe(true);
    });

    it('should allow dropping on parent tile that has composed children', () => {
      // Source tile
      const sourceTile = createMockTile('1,0:2', userId.toString());

      // Target parent with composed children
      const targetCoordId = '1,0:3';
      const targetTile = createMockTile(targetCoordId, userId.toString());

      const result = canDropOnTile(sourceTile, targetTile, targetCoordId, userId);

      expect(result).toBe(true);
    });

    it('should prevent dropping on composed child position directly', () => {
      // Source tile
      const sourceTile = createMockTile('1,0:2', userId.toString());

      // Target is composed child (negative direction)
      const targetCoordId = '1,0:3,-1';
      const targetTile = createMockTile(targetCoordId, '999');

      const result = canDropOnTile(sourceTile, targetTile, targetCoordId, userId);

      // Should fail because user doesn't own the composed child
      expect(result).toBe(false);
    });

    it('should allow swapping with composed child if user owns both', () => {
      // Source: composed child
      const sourceCoordId = '1,0:2,-1';
      const sourceTile = createMockTile(sourceCoordId, userId.toString());

      // Target: another composed child
      const targetCoordId = '1,0:2,-2';
      const targetTile = createMockTile(targetCoordId, userId.toString());

      const result = canDropOnTile(sourceTile, targetTile, targetCoordId, userId);

      expect(result).toBe(true);
    });

    it('should handle dropping on empty composed child position', () => {
      // Source tile
      const sourceTile = createMockTile('1,0:2', userId.toString());

      // Target: empty composed child position
      const targetCoordId = '1,0:3,-1';
      const targetTile = null;

      const result = canDropOnTile(sourceTile, targetTile, targetCoordId, userId);

      expect(result).toBe(true);
    });
  });

  describe('validateDragOperation - composition integration', () => {
    it('should validate dragging parent with composed children to empty position', () => {
      // Source: parent with composed children
      const sourceCoordId = '1,0:2';
      const sourceTile = createMockTile(sourceCoordId, userId.toString());

      // Target: empty position
      const targetCoordId = '1,0:3';
      const targetTile = null;

      const result = validateDragOperation(
        sourceCoordId,
        targetCoordId,
        sourceTile,
        targetTile,
        userId
      );

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should provide clear error when dropping composed child on non-owned tile', () => {
      // Source: composed child owned by user
      const sourceCoordId = '1,0:2,-1';
      const sourceTile = createMockTile(sourceCoordId, userId.toString());

      // Target: tile owned by different user
      const targetCoordId = '1,0:3';
      const targetTile = createMockTile(targetCoordId, '999');

      const result = validateDragOperation(
        sourceCoordId,
        targetCoordId,
        sourceTile,
        targetTile,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('swap');
      expect(result.reason).toContain('own');
    });

    it('should validate swapping two composed children from same parent', () => {
      // Source: composed child -1
      const sourceCoordId = '1,0:2,-1';
      const sourceTile = createMockTile(sourceCoordId, userId.toString());

      // Target: composed child -2
      const targetCoordId = '1,0:2,-2';
      const targetTile = createMockTile(targetCoordId, userId.toString());

      const result = validateDragOperation(
        sourceCoordId,
        targetCoordId,
        sourceTile,
        targetTile,
        userId
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate moving composed child to structural position', () => {
      // Source: composed child
      const sourceCoordId = '1,0:2,-1';
      const sourceTile = createMockTile(sourceCoordId, userId.toString());

      // Target: structural child position (positive direction)
      const targetCoordId = '1,0:2,3';
      const targetTile = null;

      const result = validateDragOperation(
        sourceCoordId,
        targetCoordId,
        sourceTile,
        targetTile,
        userId
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate moving structural child to composed position', () => {
      // Source: structural child
      const sourceCoordId = '1,0:2,3';
      const sourceTile = createMockTile(sourceCoordId, userId.toString());

      // Target: composed child position (negative direction)
      const targetCoordId = '1,0:2,-1';
      const targetTile = null;

      const result = validateDragOperation(
        sourceCoordId,
        targetCoordId,
        sourceTile,
        targetTile,
        userId
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle deep composition hierarchies', () => {
      // Source: deeply nested with composition
      const sourceCoordId = '1,0:2,3,4,-1';
      const sourceTile = createMockTile(sourceCoordId, userId.toString());

      // Target: another position in deep hierarchy
      const targetCoordId = '1,0:2,3,5';
      const targetTile = null;

      const result = validateDragOperation(
        sourceCoordId,
        targetCoordId,
        sourceTile,
        targetTile,
        userId
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate all composed direction values in operations', () => {
      const composedDirections = [-1, -2, -3, -4, -5, -6];

      composedDirections.forEach((direction) => {
        const sourceCoordId = `1,0:2,${direction}`;
        const sourceTile = createMockTile(sourceCoordId, userId.toString());

        const targetCoordId = '1,0:3';
        const targetTile = null;

        const result = validateDragOperation(
          sourceCoordId,
          targetCoordId,
          sourceTile,
          targetTile,
          userId
        );

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('edge cases - composition with center tile', () => {
    it('should prevent dragging center tile even if it has composed children', () => {
      // Center tile (empty path) with composed children
      const centerCoordId = '1,0:';
      const centerTile = createMockTile(centerCoordId, userId.toString());

      const result = canDragTile(centerTile, userId);

      // Center tile can never be dragged, regardless of composition
      expect(result).toBe(false);
    });

    it('should prevent dropping on center tile position', () => {
      // Source: any tile
      const sourceTile = createMockTile('1,0:2', userId.toString());

      // Target: center tile
      const targetCoordId = '1,0:';
      const centerTile = createMockTile(targetCoordId, userId.toString());

      const result = canDropOnTile(sourceTile, centerTile, targetCoordId, userId);

      expect(result).toBe(false);
    });
  });

  describe('composition detection utilities', () => {
    it('should correctly identify tiles with negative directions', () => {
      // Composed child
      const composedCoordId = '1,0:2,-1';
      const composedTile = createMockTile(composedCoordId, userId.toString());

      // The coordinate system should identify this as a composed child
      const isComposed = CoordSystem.isComposedChildId(composedCoordId);

      expect(isComposed).toBe(true);
      expect(composedTile.metadata.coordinates.path).toContain(-1);
    });

    it('should correctly identify structural tiles without negative directions', () => {
      // Structural child
      const structuralCoordId = '1,0:2,3';
      const structuralTile = createMockTile(structuralCoordId, userId.toString());

      // Should not be identified as composed
      const isComposed = CoordSystem.isComposedChildId(structuralCoordId);

      expect(isComposed).toBe(false);
      expect(structuralTile.metadata.coordinates.path.every(d => (d as number) > 0)).toBe(true);
    });

    it('should handle mixed paths with both positive and negative directions', () => {
      // Path with both structural and composed elements
      const mixedCoordId = '1,0:2,3,-1,4';

      // This should be identified as containing composition
      const isComposed = CoordSystem.isComposedChildId(mixedCoordId);

      expect(isComposed).toBe(true);
    });
  });

  describe('error messages for composition scenarios', () => {
    it('should provide helpful error when trying to swap with non-owned composed child', () => {
      const sourceCoordId = '1,0:2,-1';
      const sourceTile = createMockTile(sourceCoordId, userId.toString());

      const targetCoordId = '1,0:3,-2';
      const targetTile = createMockTile(targetCoordId, '999');

      const result = validateDragOperation(
        sourceCoordId,
        targetCoordId,
        sourceTile,
        targetTile,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason?.toLowerCase()).toMatch(/swap|own/);
    });

    it('should provide context when operation fails due to ownership', () => {
      const sourceCoordId = '1,0:2,-1';
      const sourceTile = createMockTile(sourceCoordId, '999');

      const targetCoordId = '1,0:3';
      const targetTile = null;

      const result = validateDragOperation(
        sourceCoordId,
        targetCoordId,
        sourceTile,
        targetTile,
        userId
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('own');
    });
  });
});
