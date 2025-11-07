'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { FormButton } from '~/app/components';

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
            <FormButton
              type="button"
              variant="primary"
              onClick={retry}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </FormButton>
          )}
          <FormButton
            type="button"
            variant="secondary"
            onClick={handleDismiss}
          >
            Dismiss
          </FormButton>
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
