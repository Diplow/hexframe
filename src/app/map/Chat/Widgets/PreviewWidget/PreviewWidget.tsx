import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, Move, ArrowLeftRight, Save, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import type { PreviewWidgetProps } from './types';
import { WidgetContainer } from '../_base/WidgetContainer';

/**
 * PreviewWidget - Shows tile preview with edit capabilities
 * This is a Canvas widget that can modify map tiles
 */
export function PreviewWidget({
  id,
  tile,
  mode: initialMode = 'view',
  content: initialContent,
  onTileUpdate,
  onTileDelete,
  onTileMove,
  onTileSwap,
  onEdit,
  onSave,
  onCancel,
  onClose,
  isExpanded,
  isLoading,
  error,
  timestamp,
  priority = 'action',
}: PreviewWidgetProps) {
  const [mode, setMode] = useState(initialMode);
  const [editedContent, setEditedContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (mode === 'edit' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [mode]);

  const handleEdit = () => {
    setMode('edit');
    onEdit?.();
  };

  const handleSave = () => {
    onSave?.(editedContent);
    if (onTileUpdate) {
      void onTileUpdate(tile.id, { content: editedContent });
    }
    setMode('view');
  };

  const handleCancel = () => {
    setEditedContent(initialContent);
    setMode('view');
    onCancel?.();
  };

  const handleDelete = () => {
    void onTileDelete?.(tile.id);
  };

  return (
    <WidgetContainer
      id={id}
      onClose={onClose}
      isExpanded={isExpanded}
      isLoading={isLoading}
      error={error}
      timestamp={timestamp}
      priority={priority}
      isCanvasOperation
      className="preview-widget"
    >
      <div className="space-y-3" aria-label="Tile preview">
        {/* Tile info */}
        <div>
          <h3 className="font-semibold">{tile.title}</h3>
          {tile.description && (
            <p className="text-sm text-neutral-600">{tile.description}</p>
          )}
        </div>

        {/* Content display/edit */}
        {mode === 'view' ? (
          <div className="prose prose-sm max-w-none">
            <p>{initialContent}</p>
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[100px]"
            placeholder="Enter tile content..."
          />
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {mode === 'view' ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEdit}
                disabled={isLoading}
                aria-label={`Edit ${tile.title}`}
              >
                <Edit2 className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={isLoading}
                className="text-destructive hover:text-destructive/90"
                aria-label={`Delete ${tile.title}`}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTileMove?.(tile.id, '')}
                disabled={isLoading}
                aria-label={`Move ${tile.title}`}
              >
                <Move className="mr-1 h-3 w-3" />
                Move
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTileSwap?.(tile.id, '')}
                disabled={isLoading}
                aria-label={`Swap ${tile.title}`}
              >
                <ArrowLeftRight className="mr-1 h-3 w-3" />
                Swap
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={handleSave}
                disabled={isLoading}
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </WidgetContainer>
  );
}