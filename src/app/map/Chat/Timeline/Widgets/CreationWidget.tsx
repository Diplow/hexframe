'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import { useMapCache } from '~/app/map/Cache';
import { BaseWidget, WidgetHeader, WidgetContent, WidgetActions } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface CreationWidgetProps {
  coordId: string;
  parentName?: string;
  parentCoordId?: string;
  onSave?: (name: string, preview: string, description: string) => void;
  onCancel?: () => void;
}

export function CreationWidget({ coordId, parentName, parentCoordId, onSave, onCancel }: CreationWidgetProps) {
  const [name, setName] = useState('');
  const [preview, setPreview] = useState('');
  const [description, setDescription] = useState('');
  const { navigateToItem } = useMapCache();
  
  // Calculate direction from coordId
  const getDirection = () => {
    const coords = CoordSystem.parseId(coordId);
    const lastIndex = coords.path[coords.path.length - 1];
    
    const directions: Record<number, string> = {
      1: 'north west',
      2: 'north east',
      3: 'east',
      4: 'south east',
      5: 'south west',
      6: 'west',
    };
    
    return lastIndex !== undefined ? (directions[lastIndex] ?? 'child') : 'child';
  };

  // Auto-focus name input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('[data-autofocus="true"]');
      input?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    if (name.trim() && onSave) {
      onSave(name.trim(), preview.trim(), description.trim());
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to preview field
      const previewTextarea = document.querySelector<HTMLTextAreaElement>('[data-field="preview"]');
      previewTextarea?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handlePreviewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      // Move to description field
      const descriptionTextarea = document.querySelector<HTMLTextAreaElement>('textarea:not([data-field="preview"])');
      descriptionTextarea?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <BaseWidget testId="creation-widget" className="w-full">
      <WidgetHeader
        title={
          <span>
            Create {getDirection()} child of{' '}
            {parentName && parentCoordId ? (
              <button
                className="text-link hover:underline"
                onClick={async () => {
                  if (parentCoordId) {
                    await navigateToItem(parentCoordId);
                  }
                }}
              >
                {parentName}
              </button>
            ) : (
              <span className="text-muted-foreground">parent</span>
            )}
          </span>
        }
        actions={
          <WidgetActions>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label="Save"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              <Check className="h-4 w-4 text-success" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label="Cancel"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </WidgetActions>
        }
      />

      <WidgetContent>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleNameKeyDown}
            className="w-full text-sm font-semibold bg-background px-3 py-2 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter tile name..."
            data-autofocus="true"
          />
        </div>

        <div>
          <textarea
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            onKeyDown={handlePreviewKeyDown}
            className="w-full min-h-[60px] p-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="Enter preview for AI context (helps AI decide whether to load full description)..."
            data-field="preview"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleDescriptionKeyDown}
            className="w-full min-h-[80px] p-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="Enter description... (optional)"
          />
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> to move to next field</p>
          <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Enter</kbd> to save</p>
          <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> to cancel</p>
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}