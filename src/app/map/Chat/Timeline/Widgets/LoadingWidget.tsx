'use client';

import { Loader2 } from 'lucide-react';

interface LoadingWidgetProps {
  message: string;
  operation?: 'create' | 'update' | 'delete' | 'move' | 'swap';
}

export function LoadingWidget({ message, operation }: LoadingWidgetProps) {
  const getOperationIcon = () => {
    switch (operation) {
      case 'create':
        return '✨';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'move':
        return '➡️';
      case 'swap':
        return '🔄';
      default:
        return null;
    }
  };

  const icon = getOperationIcon();

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div className="relative">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          {icon && (
            <span className="absolute -bottom-1 -right-1 text-xs">
              {icon}
            </span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}