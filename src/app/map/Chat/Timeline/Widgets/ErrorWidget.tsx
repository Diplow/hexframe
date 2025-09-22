'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface ErrorWidgetProps {
  message: string;
  error?: string;
  operation?: 'create' | 'update' | 'delete' | 'move' | 'swap';
  retry?: () => void;
  onDismiss?: () => void;
}

export function ErrorWidget({ message, error, operation, retry, onDismiss }: ErrorWidgetProps) {
  const getOperationText = () => {
    switch (operation) {
      case 'create':
        return 'creating tile';
      case 'update':
        return 'updating tile';
      case 'delete':
        return 'deleting tile';
      case 'move':
        return 'moving tile';
      case 'swap':
        return 'swapping tiles';
      default:
        return 'operation';
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  const fullErrorMessage = operation
    ? `${message} while ${getOperationText()}`
    : message;

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<AlertCircle className="h-5 w-5 text-destructive" />}
        title="Error"
        onClose={onDismiss}
      />

      <WidgetContent>
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            {fullErrorMessage}
          </p>

          {error && (
            <div className="text-sm text-muted-foreground font-mono bg-muted/50 p-3 rounded-md overflow-auto max-h-32">
              <pre className="whitespace-pre-wrap text-xs">{error}</pre>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {retry && (
            <button
              type="button"
              onClick={retry}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md
                       hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary
                       transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 text-sm font-medium text-secondary dark:text-secondary-foreground
                     bg-background dark:bg-neutral-700 border border-border
                     rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-600
                     focus:outline-none focus:ring-2 focus:ring-secondary
                     transition-colors"
          >
            Dismiss
          </button>
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}