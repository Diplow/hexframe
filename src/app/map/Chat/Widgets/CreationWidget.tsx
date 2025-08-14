'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { CoordSystem } from '~/lib/domains/mapping/utils/hex-coordinates';
import { useMapCache } from '~/app/map/Cache/interface';

interface CreationWidgetProps {
  coordId: string;
  parentName?: string;
  parentCoordId?: string;
  onSave?: (name: string, description: string) => void;
  onCancel?: () => void;
}

export function CreationWidget({ coordId, parentName, parentCoordId, onSave, onCancel }: CreationWidgetProps) {
  const [name, setName] = useState('');
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
      onSave(name.trim(), description.trim());
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to description field
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
      textarea?.focus();
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
    <div 
      data-testid="creation-widget" 
      className={cn(
        "flex flex-col flex-1 w-full bg-neutral-100 dark:bg-neutral-700",
        "rounded-lg shadow-md",
        "overflow-hidden relative"
      )}
    >
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold flex-1">
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
          </h3>
          
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label="Save"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              <Check className="h-4 w-4 text-[color:var(--success-color-600)]" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label="Cancel"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 text-[color:var(--destructive-color-600)]" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleNameKeyDown}
            className="w-full text-sm font-semibold bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter tile name..."
            data-autofocus="true"
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
            className="w-full min-h-[80px] p-2 text-sm bg-neutral-100 dark:bg-neutral-600 border border-neutral-300 dark:border-neutral-500 rounded focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            placeholder="Enter description... (optional)"
          />
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>Press <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-600 rounded text-xs">Enter</kbd> in name field to move to description</p>
          <p>Press <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-600 rounded text-xs">Ctrl+Enter</kbd> to save</p>
          <p>Press <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-600 rounded text-xs">Esc</kbd> to cancel</p>
        </div>
      </div>
    </div>
  );
}