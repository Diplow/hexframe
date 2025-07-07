import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewWidget } from '../PreviewWidget';

describe('PreviewWidget - Burger Menu', () => {
  const defaultProps = {
    tileId: 'test-tile-123',
    title: 'Test Tile',
    content: 'Test content for the tile',
  };

  it('should show burger menu button when edit or delete handlers are provided', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <PreviewWidget
        {...defaultProps}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    expect(menuButton).toBeInTheDocument();
  });

  it('should not show burger menu when no handlers are provided', () => {
    render(<PreviewWidget {...defaultProps} />);

    const menuButton = screen.queryByLabelText('More options');
    expect(menuButton).not.toBeInTheDocument();
  });

  it('should show menu options when burger menu is clicked', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <PreviewWidget
        {...defaultProps}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should call onEdit when Edit option is clicked', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <PreviewWidget
        {...defaultProps}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('should call onDelete when Delete option is clicked', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <PreviewWidget
        {...defaultProps}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('should close menu when clicking outside', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <PreviewWidget
        {...defaultProps}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('should show only Edit option when only onEdit is provided', () => {
    const onEdit = vi.fn();

    render(
      <PreviewWidget
        {...defaultProps}
        onEdit={onEdit}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('should show only Delete option when only onDelete is provided', () => {
    const onDelete = vi.fn();

    render(
      <PreviewWidget
        {...defaultProps}
        onDelete={onDelete}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});