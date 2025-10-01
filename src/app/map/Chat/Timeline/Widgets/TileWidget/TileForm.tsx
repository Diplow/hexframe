'use client';

import { useEffect } from 'react';

interface TileFormProps {
  mode: 'create' | 'edit';
  title: string;
  preview: string;
  content: string;
  onTitleChange: (value: string) => void;
  onPreviewChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TileForm({
  mode,
  title,
  preview,
  content,
  onTitleChange,
  onPreviewChange,
  onContentChange,
  onSave,
  onCancel,
}: TileFormProps) {
  // Auto-focus title input on mount when creating
  useEffect(() => {
    if (mode === 'create') {
      const timer = setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('[data-autofocus="true"]');
        input?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to preview field
      const previewTextarea = document.querySelector<HTMLTextAreaElement>('[data-field="preview"]');
      previewTextarea?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

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
      {/* Title/Name Field */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          {mode === 'create' ? 'Name' : 'Title'} *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          className="w-full text-sm font-semibold bg-neutral-100 dark:bg-neutral-700 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={mode === 'create' ? 'Enter tile name...' : 'Enter title...'}
          data-autofocus={mode === 'create' ? 'true' : undefined}
          autoFocus={mode === 'edit'}
        />
      </div>

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
        <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> to move to next field</p>
        <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Enter</kbd> to save</p>
        <p>Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> to cancel</p>
      </div>
    </div>
  );
}
