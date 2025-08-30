'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { ActionMenu } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/ActionMenu';
import { EditControls } from '~/app/map/Chat/Timeline/Widgets/PreviewWidget/EditControls';

interface PreviewHeaderProps {
  title: string;
  isExpanded: boolean;
  isEditing: boolean;
  editTitle: string;
  hasContent: boolean;
  onToggleExpansion: () => void;
  onTitleChange: (title: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PreviewHeader({
  title,
  isExpanded,
  isEditing,
  editTitle,
  hasContent,
  onToggleExpansion,
  onTitleChange,
  onTitleKeyDown,
  onEdit,
  onDelete,
  onClose,
  onSave,
  onCancel,
}: PreviewHeaderProps) {
  return (
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
        onClick={onToggleExpansion}
      >
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      {/* Title or edit input */}
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={onTitleKeyDown}
          className="flex-1 text-sm font-semibold bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
      ) : (
        <h3 
          className={cn(
            "text-sm flex-1 cursor-pointer",
            isExpanded && "font-semibold"
          )}
          onClick={() => hasContent && !isEditing && onToggleExpansion()}
        >
          {title}
        </h3>
      )}
      
      {/* Actions on the right */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isEditing ? (
          <EditControls onSave={onSave} onCancel={onCancel} />
        ) : (
          <ActionMenu 
            onEdit={onEdit}
            onDelete={onDelete}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}