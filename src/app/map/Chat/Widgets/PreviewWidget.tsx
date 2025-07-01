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
  const [isExpanded, setIsExpanded] = useState(true);

  // Collapse when tileId changes (new tile selected)
  useEffect(() => {
    setIsExpanded(false);
    // Auto-expand after a short delay for better UX
    const timer = setTimeout(() => setIsExpanded(true), 100);
    return () => clearTimeout(timer);
  }, [tileId]);

  return (
    <div 
      data-testid="preview-widget" 
      className={cn(
        "flex flex-col h-full bg-neutral-700 dark:bg-neutral-900/50",
        "border rounded-lg border-[color:var(--stroke-color-950)]",
        "overflow-hidden"
      )}
    >
      <div 
        className="flex items-center justify-between p-4 border-b border-[color:var(--stroke-color-950)] cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-semibold">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      <div 
        className={cn(
          "flex-1 overflow-auto transition-all duration-200",
          isExpanded ? "opacity-100" : "opacity-0 max-h-0"
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
    </div>
  );
}