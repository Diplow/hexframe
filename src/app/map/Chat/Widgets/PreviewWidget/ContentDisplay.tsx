'use client';

import ReactMarkdown from 'react-markdown';
import { cn } from '~/lib/utils';

interface ContentDisplayProps {
  content: string;
  editContent: string;
  isEditing: boolean;
  isExpanded: boolean;
  onContentChange: (content: string) => void;
  onContentKeyDown: (e: React.KeyboardEvent) => void;
}

export function ContentDisplay({
  content,
  editContent,
  isEditing,
  isExpanded,
  onContentChange,
  onContentKeyDown,
}: ContentDisplayProps) {
  if (!content && !isEditing) {
    return null;
  }

  return (
    <div 
      className={cn(
        "overflow-auto transition-all duration-200",
        isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="p-2">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => onContentChange(e.target.value)}
            onKeyDown={onContentKeyDown}
            className="w-full min-h-[100px] p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            placeholder="Enter description..."
          />
        ) : (
          content && (
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
          )
        )}
      </div>
    </div>
  );
}