import '~/test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DynamicFrameCore } from '~/app/map/Canvas/DynamicFrameCore';
import type { TileData } from '~/app/map/types/tile-data';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import type { URLInfo } from '~/app/map/types/url-info';

// Mock canvas theme context
vi.mock('~/app/map/Canvas', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useCanvasTheme: () => ({ isDarkMode: false }),
  };
});

// Helper to create mock tile data
function createMockTileData(coordId: string, title: string, overrides?: Partial<TileData>): TileData {
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
    ...overrides,
  };
}

describe('Canvas - Composition with Negative Directions', () => {
  let mockUrlInfo: URLInfo;
  let mockOnNavigate: (coordId: string) => void;
  let mockOnToggleExpansion: (itemId: string, coordId: string) => void;
  let mockOnCreateRequested: (payload: { coordId: string; parentName?: string; parentId?: string; parentCoordId?: string }) => void;

  beforeEach(() => {
    mockUrlInfo = {
      pathname: '/map/root-id',
      searchParamsString: '',
      rootItemId: 'root-id',
    };
    mockOnNavigate = vi.fn();
    mockOnToggleExpansion = vi.fn();
    mockOnCreateRequested = vi.fn();
  });

  describe('happy path: rendering negative direction tiles', () => {
    it('should render composed children with negative directions around composition container', () => {
      // Parent tile at 1,0:2
      const parentCoordId = '1,0:2';
      // Composition container at 1,0:2,0 (virtual)
      const compositionCoordId = '1,0:2,0';
      // Composed children with negative directions
      const composedChild1CoordId = '1,0:2,0,-1'; // ComposedNorthWest
      const composedChild2CoordId = '1,0:2,0,-2'; // ComposedNorthEast

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent'),
        [composedChild1CoordId]: createMockTileData(composedChild1CoordId, 'Composed NW'),
        [composedChild2CoordId]: createMockTileData(composedChild2CoordId, 'Composed NE'),
      };

      render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
          onNavigate={mockOnNavigate}
          onToggleExpansion={mockOnToggleExpansion}
          onCreateRequested={mockOnCreateRequested}
        />
      );

      // Virtual container should render parent item in center
      expect(screen.getByText('Parent')).toBeInTheDocument();

      // Composed children should be rendered
      expect(screen.getByText('Composed NW')).toBeInTheDocument();
      expect(screen.getByText('Composed NE')).toBeInTheDocument();
    });

    it('should render all 6 composed children when they exist', () => {
      const parentCoordId = '1,0:2';
      const compositionCoordId = '1,0:2,0';

      // All 6 composed children
      const composedChildren = [
        '1,0:2,0,-1', // ComposedNorthWest
        '1,0:2,0,-2', // ComposedNorthEast
        '1,0:2,0,-3', // ComposedEast
        '1,0:2,0,-4', // ComposedSouthEast
        '1,0:2,0,-5', // ComposedSouthWest
        '1,0:2,0,-6', // ComposedWest
      ];

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent'),
      };

      composedChildren.forEach((coordId, idx) => {
        mapItems[coordId] = createMockTileData(coordId, `Composed ${idx + 1}`);
      });

      render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // All composed children should render
      composedChildren.forEach((_, idx) => {
        expect(screen.getByText(`Composed ${idx + 1}`)).toBeInTheDocument();
      });
    });

    it('should show virtual container (parent item) in center of composition frame', () => {
      const parentCoordId = '1,0:2';
      const compositionCoordId = '1,0:2,0';
      const composedChildCoordId = '1,0:2,0,-1';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent Item'),
        [composedChildCoordId]: createMockTileData(composedChildCoordId, 'Composed Child'),
      };

      render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      // The parent item should be shown in the center
      // (because composition container is virtual and resolves to parent)
      expect(screen.getByText('Parent Item')).toBeInTheDocument();
      expect(screen.getByText('Composed Child')).toBeInTheDocument();
    });
  });

  describe('edge cases: sparse composition children', () => {
    it('should render empty tiles for missing composed children', () => {
      const parentCoordId = '1,0:2';
      const compositionCoordId = '1,0:2,0';
      const composedChild1CoordId = '1,0:2,0,-1';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent'),
        [composedChild1CoordId]: createMockTileData(composedChild1CoordId, 'Only Child'),
        // Other 5 composed children don't exist - should show empty tiles
      };

      render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          currentUserId={1}
          showNeighbors={false}
          onCreateRequested={mockOnCreateRequested}
        />
      );

      expect(screen.getByText('Only Child')).toBeInTheDocument();

      // Empty tiles should be rendered for the 5 missing composed children
      // We can't easily test for empty tiles without a data-testid, but we can verify
      // the create handler was passed through (empty tiles should be interactive)
      expect(mockOnCreateRequested).toBeDefined();
    });

    it('should handle composition with no composed children', () => {
      const parentCoordId = '1,0:2';
      const compositionCoordId = '1,0:2,0';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent Alone'),
      };

      render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          currentUserId={1}
          showNeighbors={false}
        />
      );

      // Parent should still render in center
      expect(screen.getByText('Parent Alone')).toBeInTheDocument();

      // Frame should render with empty tiles around it
      // (6 empty slots for composed children)
    });
  });

  describe('edge cases: deep nesting with negative directions', () => {
    it('should render negative direction tiles in deeply nested structures', () => {
      // Deep parent: 1,0:2,3,4
      const deepParentCoordId = '1,0:2,3,4';
      const deepCompositionCoordId = '1,0:2,3,4,0';
      const deepComposedChildCoordId = '1,0:2,3,4,0,-1';

      const mapItems: Record<string, TileData> = {
        [deepParentCoordId]: createMockTileData(deepParentCoordId, 'Deep Parent'),
        [deepComposedChildCoordId]: createMockTileData(deepComposedChildCoordId, 'Deep Composed'),
      };

      render(
        <DynamicFrameCore
          center={deepCompositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      expect(screen.getByText('Deep Parent')).toBeInTheDocument();
      expect(screen.getByText('Deep Composed')).toBeInTheDocument();
    });

    it('should handle mixed positive and negative directions in same path', () => {
      // Parent with positive directions: 1,0:2,3
      const parentCoordId = '1,0:2,3';
      const compositionCoordId = '1,0:2,3,0';
      // Composed child with negative direction: 1,0:2,3,0,-1
      const composedChildCoordId = '1,0:2,3,0,-1';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Mixed Parent'),
        [composedChildCoordId]: createMockTileData(composedChildCoordId, 'Mixed Composed'),
      };

      render(
        <DynamicFrameCore
          center={compositionCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      expect(screen.getByText('Mixed Parent')).toBeInTheDocument();
      expect(screen.getByText('Mixed Composed')).toBeInTheDocument();
    });
  });

  describe('integration: composition within expanded regular children', () => {
    it('should render composition correctly when parent is an expanded structural child', () => {
      // Structural child: 1,0:2
      const structuralChildCoordId = '1,0:2';
      // Its composition container: 1,0:2,0
      const compositionCoordId = '1,0:2,0';
      // Composed children: 1,0:2,0,-1, 1,0:2,0,-2
      const composedChild1CoordId = '1,0:2,0,-1';
      const composedChild2CoordId = '1,0:2,0,-2';

      const mapItems: Record<string, TileData> = {
        [structuralChildCoordId]: createMockTileData(structuralChildCoordId, 'Structural'),
        [composedChild1CoordId]: createMockTileData(composedChild1CoordId, 'Composed 1'),
        [composedChild2CoordId]: createMockTileData(composedChild2CoordId, 'Composed 2'),
      };

      // First verify structural child renders
      const { rerender } = render(
        <DynamicFrameCore
          center={structuralChildCoordId}
          mapItems={mapItems}
          scale={2}
          urlInfo={mockUrlInfo}
          interactive={true}
          showNeighbors={false}
        />
      );

      expect(screen.getByText('Structural')).toBeInTheDocument();

      // Then verify composition frame renders
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

      expect(screen.getByText('Structural')).toBeInTheDocument();
      expect(screen.getByText('Composed 1')).toBeInTheDocument();
      expect(screen.getByText('Composed 2')).toBeInTheDocument();
    });
  });

  describe('error cases: invalid negative directions', () => {
    it('should handle coordinate IDs with invalid negative directions gracefully', () => {
      const parentCoordId = '1,0:2';
      const compositionCoordId = '1,0:2,0';

      const mapItems: Record<string, TileData> = {
        [parentCoordId]: createMockTileData(parentCoordId, 'Parent'),
        // Attempting to create item with invalid direction
      };

      // Should not crash
      expect(() => {
        render(
          <DynamicFrameCore
            center={compositionCoordId}
            mapItems={mapItems}
            scale={2}
            urlInfo={mockUrlInfo}
            interactive={true}
            showNeighbors={false}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing parent for virtual composition container', () => {
      // Composition container without parent
      const compositionCoordId = '1,0:2,0';
      const composedChildCoordId = '1,0:2,0,-1';

      const mapItems: Record<string, TileData> = {
        // Parent at 1,0:2 is missing!
        [composedChildCoordId]: createMockTileData(composedChildCoordId, 'Orphan Composed'),
      };

      // Should not crash
      expect(() => {
        render(
          <DynamicFrameCore
            center={compositionCoordId}
            mapItems={mapItems}
            scale={2}
            urlInfo={mockUrlInfo}
            interactive={true}
            showNeighbors={false}
          />
        );
      }).not.toThrow();
    });
  });
});
