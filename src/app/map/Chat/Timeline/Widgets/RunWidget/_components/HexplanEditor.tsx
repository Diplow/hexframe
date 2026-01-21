'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText, Save, Loader2 } from 'lucide-react';
import { api } from '~/commons/trpc/react';
import { CoordSystem } from '~/lib/domains/mapping/utils';

interface HexplanEditorProps {
  label: string;
  coords: string;
  content: string;
  onSaved?: (newContent: string) => void;
}

export function HexplanEditor({ label, coords, content, onSaved }: HexplanEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);

  const updateItemMutation = api.map.updateItem.useMutation();

  // Sync edited content when prop changes
  useEffect(() => {
    setEditedContent(content);
    setHasChanges(false);
  }, [content]);

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
    setHasChanges(newContent !== content);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      const parsedCoords = CoordSystem.parseId(coords);
      await updateItemMutation.mutateAsync({
        coords: parsedCoords,
        data: {
          content: editedContent,
        },
      });
      setHasChanges(false);
      onSaved?.(editedContent);
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <FileText className="h-3 w-3 text-amber-500" />
        <span>{label}</span>
        {hasChanges && (
          <span className="text-amber-500 text-xs">(unsaved)</span>
        )}
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md">
          <textarea
            value={editedContent}
            onChange={(event) => handleContentChange(event.target.value)}
            placeholder="Hexplan content..."
            className="w-full min-h-[100px] max-h-[200px] px-2 py-1.5 text-xs font-mono border border-amber-200 dark:border-amber-800 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
            rows={4}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 truncate max-w-[200px]" title={coords}>
              {coords}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || updateItemMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateItemMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </button>
          </div>
          {updateItemMutation.isError && (
            <span className="text-xs text-destructive">
              Failed to save: {updateItemMutation.error?.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
