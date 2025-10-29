'use client';

interface TitleSectionProps {
  mode: 'view' | 'edit' | 'create' | 'history';
  isEditing: boolean;
  title: string | React.ReactNode;
  editTitle: string;
  onTitleChange: (title: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent) => void;
}

export function _TitleSection({
  mode,
  isEditing,
  title,
  editTitle,
  onTitleChange,
  onTitleKeyDown,
}: TitleSectionProps) {
  if (isEditing || mode === 'create') {
    return (
      <input
        type="text"
        value={editTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={onTitleKeyDown}
        className="flex-1 text-sm font-semibold bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder={mode === 'create' ? "Your new tile's title" : 'Enter title'}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        data-tile-title-input="true"
      />
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-sm truncate">
        {title}
      </div>
    </div>
  );
}
