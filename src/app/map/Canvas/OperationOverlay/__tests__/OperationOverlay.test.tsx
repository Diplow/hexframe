import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OperationOverlay } from '~/app/map/Canvas/OperationOverlay/OperationOverlay';

describe('OperationOverlay', () => {
  const mockGetPosition = (coordId: string) => {
    if (coordId === '1,0:1') return { x: 100, y: 200 };
    return null;
  };

  it('should render SVG overlay with operations', () => {
    const pendingOps = { '1,0:1': 'create' as const };

    render(
      <OperationOverlay pendingOperations={pendingOps} getTilePosition={mockGetPosition} scale={1} />
    );

    const svg = document.querySelector('.operation-overlay');
    expect(svg).toBeInTheDocument();
  });

  it('should render nothing when no pending operations', () => {
    render(<OperationOverlay pendingOperations={{}} getTilePosition={mockGetPosition} scale={1} />);

    const svg = document.querySelector('.operation-overlay');
    expect(svg).not.toBeInTheDocument();
  });

  it('should render marker for each operation', () => {
    const pendingOps = {
      '1,0:1': 'create' as const,
      '1,0:2': 'update' as const,
    };

    const mockGetPos = (_coordId: string) => ({ x: 0, y: 0 });

    const { container } = render(
      <OperationOverlay pendingOperations={pendingOps} getTilePosition={mockGetPos} scale={1} />
    );

    const markers = container.querySelectorAll('[data-coord-id]');
    expect(markers).toHaveLength(2);
  });

  it('should apply custom className', () => {
    const pendingOps = { '1,0:1': 'create' as const };

    render(
      <OperationOverlay
        pendingOperations={pendingOps}
        getTilePosition={mockGetPosition} scale={1}
      />
    );

    const svg = document.querySelector('.operation-overlay.custom-overlay');
    expect(svg).toBeInTheDocument();
  });

  it('should use default baseHexSize of 50', () => {
    const pendingOps = { '1,0:1': 'create' as const };

    const { container } = render(
      <OperationOverlay pendingOperations={pendingOps} getTilePosition={mockGetPosition} scale={1} />
    );

    // Check that foreignObject has correct dimensions for size 50
    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject?.getAttribute('width')).toBe('100'); // 50 * 2
  });

  it('should use custom baseHexSize', () => {
    const pendingOps = { '1,0:1': 'create' as const };

    const { container } = render(
      <OperationOverlay
        pendingOperations={pendingOps}
        getTilePosition={mockGetPosition} scale={1}
        baseHexSize={30}
      />
    );

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject?.getAttribute('width')).toBe('60'); // 30 * 2
  });

  it('should have pointer-events-none class', () => {
    const pendingOps = { '1,0:1': 'create' as const };

    render(
      <OperationOverlay pendingOperations={pendingOps} getTilePosition={mockGetPosition} scale={1} />
    );

    const svg = document.querySelector('.operation-overlay');
    expect(svg?.getAttribute('class')).toContain('pointer-events-none');
  });

  it('should have correct ARIA attributes', () => {
    const pendingOps = { '1,0:1': 'create' as const };

    render(
      <OperationOverlay pendingOperations={pendingOps} getTilePosition={mockGetPosition} scale={1} />
    );

    const svg = document.querySelector('.operation-overlay');
    expect(svg?.getAttribute('aria-live')).toBe('polite');
    expect(svg?.getAttribute('aria-atomic')).toBe('false');
  });

  it('should filter out operations without positions', () => {
    const pendingOps = {
      '1,0:1': 'create' as const,
      '1,0:999': 'delete' as const, // No position
    };

    const { container } = render(
      <OperationOverlay pendingOperations={pendingOps} getTilePosition={mockGetPosition} scale={1} />
    );

    const markers = container.querySelectorAll('[data-coord-id]');
    expect(markers).toHaveLength(1);
    expect(markers[0]?.getAttribute('data-coord-id')).toBe('1,0:1');
  });
});
