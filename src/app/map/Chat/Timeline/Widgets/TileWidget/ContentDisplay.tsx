'use client';

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

interface ContentDisplayProps {
  content: string;
  preview?: string;
  isExpanded: boolean;
  onToggleExpansion?: () => void;
}

export function ContentDisplay({
  content,
  preview = '',
  isExpanded,
  onToggleExpansion,
}: ContentDisplayProps) {
  // Don't show anything if no content and no preview
  if (!content && !preview) {
    return null;
  }

  // If not expanded, show preview (collapsed state)
  if (!isExpanded) {
    return preview ? (
      <div className="p-2">
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
          remarkPlugins={[remarkGfm, remarkBreaks]}
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