'use client';

import { WandSparkles, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface PreviewFieldProps {
  value: string;
  isGenerating: boolean;
  hasContent: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onGenerate: () => void;
}

export function _PreviewField({
  value,
  isGenerating,
  hasContent,
  onChange,
  onKeyDown,
  onGenerate,
}: PreviewFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-muted-foreground">
          Preview
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={!hasContent || isGenerating}
          onClick={onGenerate}
          title={hasContent ? "Generate preview with AI" : "Add content first"}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WandSparkles className="h-4 w-4" />
          )}
        </Button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full min-h-[60px] p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        placeholder="Enter preview for AI context (helps AI decide whether to load full content)"
        data-field="preview"
      />
    </div>
  );
}
