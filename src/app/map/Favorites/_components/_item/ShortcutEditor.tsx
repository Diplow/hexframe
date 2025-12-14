'use client';

import type { KeyboardEvent, ChangeEvent } from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '~/components/ui/button';

export interface ShortcutEditorProps {
  /** Current shortcut name (without @) */
  initialValue: string;
  /** Callback when save is clicked with the new value */
  onSave: (newValue: string) => void;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Whether the save operation is in progress */
  isSaving?: boolean;
  /** Error message to display */
  error?: string;
}

/**
 * Inline editor for shortcut names.
 * Replaces the @shortcut display with an input field and save/cancel buttons.
 */
export function ShortcutEditor({
  initialValue,
  onSave,
  onCancel,
  isSaving = false,
  error,
}: ShortcutEditorProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  const handleSave = useCallback(() => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      // Empty input, treat as cancel
      onCancel();
    } else if (trimmedValue !== initialValue) {
      onSave(trimmedValue);
    } else {
      // No change, just cancel
      onCancel();
    }
  }, [value, initialValue, onSave, onCancel]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }, [handleSave, onCancel]);

  const isValid = value.trim().length > 0;
  const hasChanged = value.trim() !== initialValue;

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-primary">@</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="flex-1 min-w-0 px-2 py-1 text-sm font-medium border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          aria-label="Edit shortcut name"
          placeholder="shortcut_name"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-success hover:text-success/80 hover:bg-success/10"
          onClick={handleSave}
          disabled={isSaving || !isValid || !hasChanged}
          aria-label="Save shortcut name"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Cancel editing"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
