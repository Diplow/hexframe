'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';

interface PreviewWidgetProps {
  tileId: string;
  title: string;
  content: string;
  forceExpanded?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PreviewWidget({ tileId, title, content, forceExpanded, onEdit, onDelete }: PreviewWidgetProps) {
  // Start collapsed if content is empty
  const [isExpanded, setIsExpanded] = useState(!!content);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update expansion state when forceExpanded changes
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded && !!content);
    }
  }, [forceExpanded, content]);

  // Update expansion state when tileId or content changes
  useEffect(() => {
    if (forceExpanded === undefined) {
      if (!content) {
        // Keep collapsed if no content
        setIsExpanded(false);
      } else {
        // Collapse briefly then expand for animation
        setIsExpanded(false);
        const timer = setTimeout(() => setIsExpanded(true), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [tileId, content, forceExpanded]);

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  return (
    <div 
      data-testid="preview-widget" 
      className={cn(
        "flex flex-col flex-1 w-full bg-neutral-400 dark:bg-neutral-600",
        "rounded-lg shadow-md",
        "overflow-hidden"
      )}
    >
      <div 
        className={cn(
          "flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800",
          isExpanded ? "p-4" : "p-2"
        )}
      >
        <h3 
          className={cn(
            "text-sm flex-1 cursor-pointer",
            isExpanded && "font-semibold"
          )}
          onClick={() => content && setIsExpanded(!isExpanded)}
        >{title}</h3>
        <div className="flex items-center gap-1">
          {content && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {(onEdit ?? onDelete) && (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                aria-label="More options"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
                  {onEdit && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit();
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-[color:var(--destructive-color-600)] dark:text-[color:var(--destructive-color-400)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete();
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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