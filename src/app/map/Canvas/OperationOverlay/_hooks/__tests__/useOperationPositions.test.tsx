import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOperationPositions } from '~/app/map/Canvas/OperationOverlay/_hooks/useOperationPositions';

describe('useOperationPositions', () => {
  const mockGetPosition = (coordId: string) => {
    if (coordId === '1,0:1') return { x: 100, y: 200 };
    if (coordId === '1,0:2') return { x: 300, y: 400 };
    return null;
  };

  it('should map operations to positions', () => {
    const pendingOps = {
      '1,0:1': 'create' as const,
      '1,0:2': 'update' as const,
    };

    const { result } = renderHook(() => useOperationPositions(pendingOps, mockGetPosition));

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toMatchObject({
      coordId: '1,0:1',
      operation: 'create',
      position: { x: 100, y: 200 },
    });
  });

  it('should filter out operations with no position', () => {
    const pendingOps = {
      '1,0:1': 'create' as const,
      '1,0:999': 'delete' as const, // No position
    };

    const { result } = renderHook(() => useOperationPositions(pendingOps, mockGetPosition));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.coordId).toBe('1,0:1');
  });

  it('should memoize results', () => {
    const pendingOps = { '1,0:1': 'create' as const };

    const { result, rerender } = renderHook(() =>
      useOperationPositions(pendingOps, mockGetPosition)
    );

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult); // Same reference
  });

  it('should update when pendingOperations change', () => {
    const initialOps: Record<string, 'create' | 'update' | 'delete' | 'move' | 'copy'> = {
      '1,0:1': 'create',
    };
    const updatedOps: Record<string, 'create' | 'update' | 'delete' | 'move' | 'copy'> = {
      '1,0:2': 'update',
    };

    const { result, rerender } = renderHook(
      ({ ops }) => useOperationPositions(ops, mockGetPosition),
      {
        initialProps: { ops: initialOps },
      }
    );

    const firstResult = result.current;

    rerender({ ops: updatedOps });

    expect(result.current).not.toBe(firstResult);
    expect(result.current[0]?.coordId).toBe('1,0:2');
  });

  it('should handle empty operations', () => {
    const { result } = renderHook(() => useOperationPositions({}, mockGetPosition));

    expect(result.current).toEqual([]);
  });

  it('should preserve all operation types', () => {
    const pendingOps = {
      '1,0:1': 'create' as const,
      '1,0:2': 'update' as const,
    };

    const { result } = renderHook(() => useOperationPositions(pendingOps, mockGetPosition));

    const operations = result.current.map((p) => p.operation);
    expect(operations).toContain('create');
    expect(operations).toContain('update');
  });
});
