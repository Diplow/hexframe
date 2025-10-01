'use client';

import { useEffect } from 'react';

interface TileFormProps {
  mode: 'create' | 'edit';
  preview: string;
  content: string;
  onPreviewChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TileForm({
  mode,
  preview,
  content,
  onPreviewChange,
  onContentChange,
  onSave,
  onCancel,
}: TileFormProps) {
  // Auto-focus preview field on mount when creating
  useEffect(() => {
    if (mode === 'create') {
      const timer = setTimeout(() => {
        const input = document.querySelector<HTMLTextAreaElement>('[data-autofocus="true"]');
        input?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const handlePreviewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to content field
      const contentTextarea = document.querySelector<HTMLTextAreaElement>('[data-field="content"]');
      contentTextarea?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="p-3 space-y-3">

      {/* Preview Field */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Preview
        </label>
        <textarea
          value={preview}
          onChange={(e) => onPreviewChange(e.target.value)}
          onKeyDown={handlePreviewKeyDown}
          className="w-full min-h-[60px] p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Enter preview for AI context (helps AI decide whether to load full content)..."
          data-field="preview"
          data-autofocus={mode === 'create' ? 'true' : undefined}
        />
      </div>

      {/* Content Field */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Content
        </label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleContentKeyDown}
          className="w-full min-h-[100px] p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Enter content... (optional)"
          data-field="content"
        />
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> in Preview to move to Content</p>
        <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Enter</kbd> to save</p>
        <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> to cancel</p>
      </div>
    </div>
  );
}
