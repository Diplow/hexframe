import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OperationMarker } from '~/app/map/Canvas/OperationOverlay/_components/OperationMarker';

describe('OperationMarker', () => {
  it('should position at given coordinates', () => {
    const { container } = render(
      <svg>
        <OperationMarker
          coordId="1,0:1"
          operation="create"
          position={{ x: 100, y: 200 }}
          width={100} height={115}
        />
      </svg>
    );

    const g = container.querySelector('g');
    expect(g?.getAttribute('transform')).toBe('translate(100, 200)');
  });

  it('should include data attributes for debugging', () => {
    const { container } = render(
      <svg>
        <OperationMarker
          coordId="1,0:1,2"
          operation="update"
          position={{ x: 0, y: 0 }}
          width={100} height={115}
        />
      </svg>
    );

    const g = container.querySelector('g');
    expect(g?.getAttribute('data-coord-id')).toBe('1,0:1,2');
    expect(g?.getAttribute('data-operation')).toBe('update');
  });

  it('should render HexagonPulse inside foreignObject', () => {
    const { container } = render(
      <svg>
        <OperationMarker
          coordId="1,0:1"
          operation="delete"
          position={{ x: 50, y: 50 }}
          width={100} height={115}
        />
      </svg>
    );

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject).toBeInTheDocument();
    expect(foreignObject?.querySelector('.hex-pulse')).toBeInTheDocument();
  });

  it('should center foreignObject at position', () => {
    const { container } = render(
      <svg>
        <OperationMarker
          coordId="1,0:1"
          operation="move"
          position={{ x: 100, y: 200 }}
          width={100} height={115}
        />
      </svg>
    );

    const foreignObject = container.querySelector('foreignObject');
    // ForeignObject should be offset to center the hexagon at the position
    expect(foreignObject?.getAttribute('x')).toBe('-50'); // -width/2
    expect(foreignObject?.getAttribute('y')).toBe('-57.5'); // -height/2
  });

  it('should set correct foreignObject dimensions', () => {
    const { container } = render(
      <svg>
        <OperationMarker
          coordId="1,0:1"
          operation="copy"
          position={{ x: 0, y: 0 }}
          width={60} height={70}
        />
      </svg>
    );

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject?.getAttribute('width')).toBe('60');
    expect(foreignObject?.getAttribute('height')).toBe('70');
  });
});
