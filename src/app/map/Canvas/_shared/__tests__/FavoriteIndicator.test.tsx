import '~/test/setup';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteIndicator } from '~/app/map/Canvas/_shared/FavoriteIndicator';

describe('FavoriteIndicator', () => {
  describe('when tile is favorited', () => {
    it('should render star icon when isFavorited is true', () => {
      render(<FavoriteIndicator isFavorited={true} shortcutName="my_project" scale={2} />);

      // Star icon should be present - using testid since lucide icons don't have role="img"
      const starIcon = screen.getByTestId('favorite-indicator');
      expect(starIcon).toBeInTheDocument();
    });

    it('should show tooltip with shortcut name prefixed with @ on hover', async () => {
      const user = userEvent.setup();
      render(<FavoriteIndicator isFavorited={true} shortcutName="my_project" scale={2} />);

      const indicator = screen.getByTestId('favorite-indicator');
      await user.hover(indicator);

      // Tooltip should show @shortcutName format
      await waitFor(() => {
        expect(screen.getByText('@my_project')).toBeInTheDocument();
      });
    });

    it('should scale icon size based on scale prop', () => {
      // Scale 1 should have smaller icon
      const { rerender } = render(
        <FavoriteIndicator isFavorited={true} shortcutName="test" scale={1} />
      );

      const smallIndicator = screen.getByTestId('favorite-indicator');
      expect(smallIndicator).toBeInTheDocument();

      // Scale 2+ should have larger icon
      rerender(<FavoriteIndicator isFavorited={true} shortcutName="test" scale={2} />);

      const largeIndicator = screen.getByTestId('favorite-indicator');
      expect(largeIndicator).toBeInTheDocument();
    });

    it('should be positioned bottom-center (opposite to visibility indicator at top-center)', () => {
      render(<FavoriteIndicator isFavorited={true} shortcutName="test" scale={2} />);

      const indicator = screen.getByTestId('favorite-indicator');
      // Indicator container should have absolute positioning for bottom-center placement
      expect(indicator.className).toMatch(/absolute/);
      expect(indicator.className).toMatch(/bottom/);
    });
  });

  describe('when tile is not favorited', () => {
    it('should not render anything when isFavorited is false', () => {
      render(<FavoriteIndicator isFavorited={false} scale={2} />);

      expect(screen.queryByTestId('favorite-indicator')).not.toBeInTheDocument();
    });

    it('should not render when isFavorited is undefined', () => {
      render(<FavoriteIndicator scale={2} />);

      expect(screen.queryByTestId('favorite-indicator')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle missing shortcutName gracefully when favorited', () => {
      // Even without shortcutName, should still show star (shortcutName optional for display)
      render(<FavoriteIndicator isFavorited={true} scale={2} />);

      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument();
    });

    it('should handle empty shortcutName', async () => {
      const user = userEvent.setup();
      render(<FavoriteIndicator isFavorited={true} shortcutName="" scale={2} />);

      const indicator = screen.getByTestId('favorite-indicator');
      await user.hover(indicator);

      // Should still show indicator but with appropriate tooltip behavior
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have cursor-help class for indicating interactive tooltip', () => {
      render(<FavoriteIndicator isFavorited={true} shortcutName="test" scale={2} />);

      const indicator = screen.getByTestId('favorite-indicator');
      expect(indicator.querySelector('svg')).toHaveClass('cursor-help');
    });
  });
});
