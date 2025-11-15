import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HexagonPulse } from '~/app/map/Canvas/OperationOverlay/_components/HexagonPulse';

describe('HexagonPulse', () => {
  it('should render SVG element', () => {
    render(<HexagonPulse operation="create" width={100} height={115} />);
    const svg = screen.getByRole('status');
    expect(svg.tagName).toBe('svg');
  });

  it('should have ARIA label for accessibility', () => {
    render(<HexagonPulse operation="delete" width={100} height={115} />);
    expect(screen.getByLabelText(/delete operation in progress/i)).toBeInTheDocument();
  });

  it('should render three path elements (glow, fill, stroke)', () => {
    const { container } = render(<HexagonPulse operation="update" width={100} height={115} />);
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(3);
  });

  it('should apply operation-specific classes', () => {
    const { container } = render(<HexagonPulse operation="create" width={100} height={115} />);

    expect(container.querySelector('.hex-pulse-glow')).toBeInTheDocument();
    expect(container.querySelector('.hex-pulse-fill')).toBeInTheDocument();
    expect(container.querySelector('.hex-pulse-stroke')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <HexagonPulse operation="move" width={100} height={115} className="custom-class" />
    );
    const svg = container.querySelector('.hex-pulse.custom-class');
    expect(svg).toBeInTheDocument();
  });

  it('should use default size of 50', () => {
    const { container } = render(<HexagonPulse operation="copy" width={100} height={115} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '100px' }); // 50 * 2
  });

  it('should scale correctly with different sizes', () => {
    const { container } = render(<HexagonPulse operation="create" width={60} height={70} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '60px' });
  });

  it('should render different labels for different operations', () => {
    const { rerender } = render(<HexagonPulse operation="create" width={100} height={115} />);
    expect(screen.getByLabelText(/create operation in progress/i)).toBeInTheDocument();

    rerender(<HexagonPulse operation="update" width={100} height={115} />);
    expect(screen.getByLabelText(/update operation in progress/i)).toBeInTheDocument();
  });
});
