'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { BaseWidget, WidgetHeader, WidgetContent, WidgetActions } from '~/app/map/Chat/Timeline/Widgets/_shared';

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

  return (
    <BaseWidget variant="destructive" className="w-full max-w-md mx-auto">
      <WidgetHeader
        icon={<AlertCircle className="h-5 w-5 text-destructive" />}
        title={message}
        subtitle={operation && `Failed while ${getOperationText()}`}
        onClose={onDismiss}
      />

      <WidgetContent>
        {error && (
          <p className="text-sm text-muted-foreground">
            {error}
          </p>
        )}

        <WidgetActions align="left">
          {retry && (
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
          >
            Dismiss
          </Button>
        </WidgetActions>
      </WidgetContent>
    </BaseWidget>
  );
}