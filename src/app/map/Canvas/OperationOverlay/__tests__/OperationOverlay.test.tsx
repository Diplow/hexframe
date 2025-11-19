import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { OperationOverlay } from '~/app/map/Canvas/OperationOverlay/OperationOverlay';

// Mock the Operations hook
vi.mock('~/app/map/Services/Operations', () => ({
  usePendingOperations: vi.fn(() => ({})),
}));

describe('OperationOverlay', () => {
  const mockGetPosition = (coordId: string) => {
    if (coordId === '1,0:1') return { x: 100, y: 200 };
    return null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render SVG overlay with operations', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({ '1,0:1': 'create' });

    const { container } = render(
      <OperationOverlay getTilePosition={mockGetPosition} scale={1} />
    );

    const wrapper = container.querySelector('.operation-overlay-wrapper');
    expect(wrapper).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should render nothing when no pending operations', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({});

    const { container } = render(<OperationOverlay getTilePosition={mockGetPosition} scale={1} />);

    const wrapper = container.querySelector('.operation-overlay-wrapper');
    expect(wrapper).not.toBeInTheDocument();
  });

  it('should render marker for each operation', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({
      '1,0:1': 'create',
      '1,0:2': 'update',
    });

    const mockGetPos = (_coordId: string) => ({ x: 0, y: 0 });

    const { container } = render(
      <OperationOverlay getTilePosition={mockGetPos} scale={1} />
    );

    const markers = container.querySelectorAll('[data-coord-id]');
    expect(markers).toHaveLength(2);
  });

  it('should apply wrapper styles correctly', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({ '1,0:1': 'create' });

    const { container } = render(
      <OperationOverlay
        getTilePosition={mockGetPosition} scale={1}
      />
    );

    const wrapper = container.querySelector('.operation-overlay-wrapper');
    expect(wrapper).toHaveClass('fixed', 'inset-0', 'pointer-events-none');
  });

  it('should use default baseHexSize of 50', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({ '1,0:1': 'create' });

    const { container } = render(
      <OperationOverlay getTilePosition={mockGetPosition} scale={1} />
    );

    // Check that foreignObject has correct dimensions for scale=1, baseHexSize=50
    // width = 50 * √3 ≈ 86.6 → 87 (rounded)
    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject?.getAttribute('width')).toBe('87');
  });

  it('should use custom baseHexSize', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({ '1,0:1': 'create' });

    const { container } = render(
      <OperationOverlay
        getTilePosition={mockGetPosition} scale={1}
        baseHexSize={30}
      />
    );

    // width = 30 * √3 ≈ 51.96 → 52 (rounded)
    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject?.getAttribute('width')).toBe('52');
  });

  it('should have pointer-events-none class', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({ '1,0:1': 'create' });

    const { container } = render(
      <OperationOverlay getTilePosition={mockGetPosition} scale={1} />
    );

    const wrapper = container.querySelector('.operation-overlay-wrapper');
    expect(wrapper).toHaveClass('pointer-events-none');
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('pointer-events-none');
  });

  it('should have correct ARIA attributes', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({ '1,0:1': 'create' });

    const { container } = render(
      <OperationOverlay getTilePosition={mockGetPosition} scale={1} />
    );

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-live')).toBe('polite');
    expect(svg?.getAttribute('aria-atomic')).toBe('false');
  });

  it('should filter out operations without positions', async () => {
    const { usePendingOperations } = await import('~/app/map/Services/Operations');
    vi.mocked(usePendingOperations).mockReturnValue({
      '1,0:1': 'create',
      '1,0:999': 'delete', // No position
    });

    const { container } = render(
      <OperationOverlay getTilePosition={mockGetPosition} scale={1} />
    );

    const markers = container.querySelectorAll('[data-coord-id]');
    expect(markers).toHaveLength(1);
    expect(markers[0]?.getAttribute('data-coord-id')).toBe('1,0:1');
  });
});
