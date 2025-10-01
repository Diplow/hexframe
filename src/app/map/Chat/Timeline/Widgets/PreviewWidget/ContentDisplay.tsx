'use client';

import ReactMarkdown from 'react-markdown';

interface ContentDisplayProps {
  content: string;
  preview?: string;
  editContent: string;
  isEditing: boolean;
  isExpanded: boolean;
  onContentChange: (content: string) => void;
  onContentKeyDown: (e: React.KeyboardEvent) => void;
  onToggleExpansion?: () => void;
}

export function ContentDisplay({
  content,
  preview = '',
  editContent,
  isEditing,
  isExpanded,
  onContentChange,
  onContentKeyDown,
  onToggleExpansion,
}: ContentDisplayProps) {
  // Don't show anything if no content and no preview and not editing
  if (!content && !preview && !isEditing) {
    return null;
  }

  // If editing, show the expanded textarea
  if (isEditing) {
    return (
      <div className="p-2">
        <textarea
          value={editContent}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={onContentKeyDown}
          className="w-full min-h-[100px] p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Enter description..."
        />
      </div>
    );
  }

  // If not expanded, show preview (collapsed state)
  if (!isExpanded) {
    return preview ? (
      <div className="p-2 border-t border-border">
        <div className="text-sm text-muted-foreground">
          {preview}
          {content && (
            <button
              onClick={onToggleExpansion}
              className="ml-2 text-link hover:underline"
            >
              Show full content
            </button>
          )}
        </div>
      </div>
    ) : null;
  }

  // If expanded, show full description content
  return content ? (
    <div className="p-2">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          components={{
            // Ensure links open in new tab for security
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {onToggleExpansion && (
        <button
          onClick={onToggleExpansion}
          className="mt-2 text-sm text-link hover:underline"
        >
          Show less
        </button>
      )}
    </div>
  ) : null;
}