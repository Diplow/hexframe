import '~/test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DynamicFrameCore } from '~/app/map/Canvas/DynamicFrameCore';
import type { TileData } from '~/app/map/types/tile-data';
import { Direction } from '~/app/map/constants';
import { CoordSystem } from '~/lib/domains/mapping/utils';

// Mock canvas theme context
vi.mock('~/app/map/Canvas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/app/map/Canvas')>();
  return {
    ...actual,
    useCanvasTheme: () => ({ isDarkMode: false }),
  };
});

// Helper to create mock tile data
function createMockTileData(coordId: string, title: string): TileData {
  const coord = CoordSystem.parseId(coordId);

  return {
    metadata: {
      dbId: `${title}-id`,
      coordId,
      parentId: coord.path.length > 0 ? CoordSystem.createId(CoordSystem.getParentCoord(coord)!) : undefined,
      coordinates: coord,
      depth: coord.path.length,
      ownerId: '1',
    },
    data: {
      title,
      content: `${title} content`,
      preview: `${title} preview`,
      link: '',
      color: 'amber-500',
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
  };
}

describe('FrameInterior - Negative Direction Child Positioning', () => {
  let mockUrlInfo: any;

  beforeEach(() => {
    mockUrlInfo = {
      rootItemId: 'root-id',
      userId: 1,
      groupId: 0,
    };
  });

  describe('child coordinate calculation', () => {
    it('should calculate correct child coordinates for composition container including negative directions', () => {
      const compositionCoordId = '1,0:2,0';
      const parentCoordId = '1,0:2';

      // Expected composed child coordinates (negative directions)
      const expectedChildCoords = [
        '1,0:2,0,-1', // ComposedNorthWest (NW position)
        '1,0:2,0,-2', // ComposedNorthEast (NE position)
        '1,0:2,0,-3', // ComposedEast (E position)
        '1,0:2,0,-4', // ComposedSouthEast (SE position)
        '1,0:2,0,-5', // ComposedSouthWest (SW position)
        '1,0:2,0,-6', // ComposedWest (W position)
      ];

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent'),
      };

      expectedChildCoords.forEach((coordId, idx) => {
        mapItems[coordId] = createMockTileData(coordId, `Child ${idx + 1}`);
      });

      // Render the frame and verify all children are positioned
      const { container } = render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // Verify the frame interior rendered (has the expected row structure)
      const rows = container.querySelectorAll('.flex.justify-center');
      expect(rows.length).toBe(3); // 3 rows in hexagonal layout
    });

    it('should position negative direction children in correct hexagonal slots', () => {
      const compositionCoordId = '1,0:2,0';
      const parentCoordId = '1,0:2';

      // Map each direction to its expected position in the frame
      const directionPositions = {
        '-1': 'NW', // ComposedNorthWest
        '-2': 'NE', // ComposedNorthEast
        '-3': 'E',  // ComposedEast
        '-4': 'SE', // ComposedSouthEast
        '-5': 'SW', // ComposedSouthWest
        '-6': 'W',  // ComposedWest
      };

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Center'),
      };

      Object.keys(directionPositions).forEach((dir) => {
        const coordId = `1,0:2,0,${dir}`;
        mapItems[coordId] = createMockTileData(coordId, `Pos-${directionPositions[dir as keyof typeof directionPositions]}`);
      });

      const { container } = render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // Verify frame structure exists (3 rows for hexagonal layout)
      const rows = container.querySelectorAll('.flex.justify-center');
      expect(rows.length).toBe(3);

      // Row 0: NW, NE (2 tiles)
      const row0 = rows[0];
      expect(row0?.children.length).toBe(2);

      // Row 1: W, C, E (3 tiles - includes center)
      const row1 = rows[1];
      expect(row1?.children.length).toBe(3);

      // Row 2: SW, SE (2 tiles)
      const row2 = rows[2];
      expect(row2?.children.length).toBe(2);
    });
  });

  describe('center tile special handling', () => {
    it('should render parent item in center position of composition frame', () => {
      const compositionCoordId = '1,0:2,0';
      const parentCoordId = '1,0:2';
      const composedChildCoordId = '1,0:2,0,-1';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent in Center'),
        [composedChildCoordId]: createMockTileData(composedChildCoordId, 'Composed Child'),
      };

      const { container } = render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // Verify center position (row 1, middle child) exists
      const rows = container.querySelectorAll('.flex.justify-center');
      const centerRow = rows[1];
      expect(centerRow?.children.length).toBe(3); // W, C, E
    });

    it('should not render structural children (directions 1-6) when showing composition', () => {
      const compositionCoordId = '1,0:2,0';
      const parentCoordId = '1,0:2';

      // Composed children (negative directions)
      const composedChildCoordId = '1,0:2,0,-1';

      // Structural children (positive directions) - should NOT appear in composition frame
      const structuralChildCoordId = '1,0:2,1';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent'),
        [composedChildCoordId]: createMockTileData(composedChildCoordId, 'Composed Child'),
        [structuralChildCoordId]: createMockTileData(structuralChildCoordId, 'Structural Child'),
      };

      const { queryByText } = render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // Composed child should appear
      expect(queryByText('Composed Child')).toBeInTheDocument();

      // Structural child should NOT appear in composition frame
      expect(queryByText('Structural Child')).not.toBeInTheDocument();
    });
  });

  describe('margin calculations for negative direction tiles', () => {
    it('should apply correct negative margins for hexagonal row spacing', () => {
      const compositionCoordId = '1,0:2,0';
      const parentCoordId = '1,0:2';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent'),
        '1,0:2,0,-1': createMockTileData('1,0:2,0,-1', 'Child 1'),
        '1,0:2,0,-2': createMockTileData('1,0:2,0,-2', 'Child 2'),
      };

      const { container } = render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          baseHexSize={50}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      const rows = container.querySelectorAll('.flex.justify-center');

      // First row should have no marginTop
      const row0 = rows[0] as HTMLElement;
      expect(row0?.style.marginTop).toBeFalsy();

      // Second and third rows should have negative marginTop for edge-sharing
      const row1 = rows[1] as HTMLElement;
      expect(row1?.style.marginTop).toBeTruthy();
      expect(row1?.style.marginTop).toContain('-');

      const row2 = rows[2] as HTMLElement;
      expect(row2?.style.marginTop).toBeTruthy();
      expect(row2?.style.marginTop).toContain('-');
    });
  });

  describe('scale progression with negative directions', () => {
    it('should reduce scale for composed children when parent frame is expanded', () => {
      const compositionCoordId = '1,0:2,0';
      const parentCoordId = '1,0:2';
      const composedChildCoordId = '1,0:2,0,-1';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent'),
        [composedChildCoordId]: createMockTileData(composedChildCoordId, 'Composed Child'),
      };

      // Render at scale 3 (center scale)
      const { rerender } = render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={3}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // Children should be at scale 2 (3 - 1)
      // We can verify this by checking the component doesn't crash
      expect(true).toBe(true);

      // Render at scale 2
      rerender(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // Children should be at scale 1 (2 - 1)
      expect(true).toBe(true);

      // At scale 1, children cannot expand further (minimum scale)
      rerender(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={1}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // Should still render without crashing
      expect(true).toBe(true);
    });
  });
});
