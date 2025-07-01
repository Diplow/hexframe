'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';

interface PreviewWidgetProps {
  tileId: string;
  title: string;
  content: string;
}

export function PreviewWidget({ tileId, title, content }: PreviewWidgetProps) {
  // Start collapsed if content is empty
  const [isExpanded, setIsExpanded] = useState(!!content);

  // Update expansion state when tileId or content changes
  useEffect(() => {
    if (!content) {
      // Keep collapsed if no content
      setIsExpanded(false);
    } else {
      // Collapse briefly then expand for animation
      setIsExpanded(false);
      const timer = setTimeout(() => setIsExpanded(true), 100);
      return () => clearTimeout(timer);
    }
  }, [tileId, content]);

  return (
    <div 
      data-testid="preview-widget" 
      className={cn(
        "flex flex-col w-full bg-neutral-700 dark:bg-neutral-900/50",
        "border rounded-lg border-[color:var(--stroke-color-950)]",
        "overflow-hidden"
      )}
    >
      <div 
        className={cn(
          "flex items-center justify-between border-b border-[color:var(--stroke-color-950)] cursor-pointer",
          isExpanded ? "p-4" : "p-2"
        )}
        onClick={() => content && setIsExpanded(!isExpanded)}
      >
        <h3 className={cn(
          "text-sm",
          isExpanded && "font-semibold"
        )}>{title}</h3>
        {content && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>
      
      {content && (
        <div 
          className={cn(
            "overflow-auto transition-all duration-200",
            isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="p-4">
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
          </div>
        </div>
      )}
    </div>
  );
}