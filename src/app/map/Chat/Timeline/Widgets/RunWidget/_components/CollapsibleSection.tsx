'use client';

import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  iconColorClass?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  iconColorClass = 'text-neutral-400',
  defaultExpanded = false,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
          isExpanded
            ? 'bg-neutral-100 dark:bg-neutral-800'
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
        title={isExpanded ? `Hide ${title}` : `Show ${title}`}
      >
        <span className={iconColorClass}>{icon}</span>
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {title}
        </span>
      </button>
      {isExpanded && <div className="mt-1">{children}</div>}
    </div>
  );
}
