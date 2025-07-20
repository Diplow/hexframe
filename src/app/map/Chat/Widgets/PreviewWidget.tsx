'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, MoreVertical, Edit, Trash2, Check, X } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Portal } from './Portal';

interface PreviewWidgetProps {
  tileId: string;
  title: string;
  content: string;
  forceExpanded?: boolean;
  openInEditMode?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (title: string, content: string) => void;
}

export function PreviewWidget({ tileId, title, content, forceExpanded, openInEditMode, onEdit, onDelete, onSave }: PreviewWidgetProps) {
  // Start collapsed if content is empty
  const [isExpanded, setIsExpanded] = useState(!!content);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(openInEditMode ?? false);
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(content);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Update expansion state when forceExpanded changes
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded && !!content);
    }
  }, [forceExpanded, content]);

  // Handle openInEditMode flag
  useEffect(() => {
    if (openInEditMode) {
      setIsEditing(true);
      setIsExpanded(true);
    }
  }, [openInEditMode]);

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

  // Update edit fields when props change
  useEffect(() => {
    setEditTitle(title);
    setEditContent(content);
  }, [title, content]);

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

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
    setShowMenu(false);
  };

  const handleMenuToggle = () => {
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const menuWidth = 120; // Approximate menu width
      const menuHeight = 80; // Approximate menu height
      
      // Calculate position
      let top = rect.bottom + 4;
      let left = rect.right - menuWidth;
      
      // Check if menu would go off bottom of screen
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
      }
      
      // Check if menu would go off left edge
      if (left < 0) {
        left = rect.left;
      }
      
      setMenuPosition({ top, left });
    }
    setShowMenu(!showMenu);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editTitle, editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(title);
    setEditContent(content);
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div 
      data-testid="preview-widget" 
      className={cn(
        "flex flex-col flex-1 w-full bg-neutral-400 dark:bg-neutral-600",
        "rounded-lg shadow-md",
        "overflow-hidden relative"
      )}
    >
      <div 
        className={cn(
          "flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800",
          "p-2"
        )}
      >
        {/* Chevron button on the left - always show */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          aria-label={isExpanded ? "Collapse" : "Expand"}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {/* Title or edit input */}
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 text-sm font-semibold bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        ) : (
          <h3 
            className={cn(
              "text-sm flex-1 cursor-pointer",
              isExpanded && "font-semibold"
            )}
            onClick={() => content && !isEditing && setIsExpanded(!isExpanded)}
          >{title}</h3>
        )}
        
        {/* Actions on the right */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                aria-label="Save"
                onClick={handleSave}
              >
                <Check className="h-4 w-4 text-[color:var(--success-color-600)]" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                aria-label="Cancel"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 text-[color:var(--destructive-color-600)]" />
              </Button>
            </>
          ) : (
            (onEdit ?? onDelete) && (
              <>
                <Button
                  ref={menuButtonRef}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  aria-label="More options"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuToggle();
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {showMenu && menuPosition && (
                  <Portal>
                    <div 
                      ref={menuRef}
                      className="fixed z-50 min-w-[120px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg"
                      style={{ top: menuPosition.top, left: menuPosition.left }}
                    >
                      {onEdit && (
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit();
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
                            if (onDelete) {
                              onDelete();
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </Portal>
                )}
              </>
            )
          )}
        </div>
      </div>
      
      {(content || isEditing) && (
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
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleDescriptionKeyDown}
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
      )}
    </div>
  );
}