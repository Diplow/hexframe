'use client';

interface ContentFieldProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function _ContentField({ value, onChange, onKeyDown }: ContentFieldProps) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">
        Content
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full min-h-[100px] p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        placeholder="Enter content (optional)"
        data-field="content"
      />
    </div>
  );
}
