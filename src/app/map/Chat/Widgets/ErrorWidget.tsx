'use client';

import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorWidgetProps {
  message: string;
  error?: string;
  operation?: 'create' | 'update' | 'delete' | 'move' | 'swap';
  retry?: () => void;
}

export function ErrorWidget({ message, error, operation, retry }: ErrorWidgetProps) {

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
    // For now, we don't have a way to dismiss error widgets
    // They will be auto-dismissed when a new event occurs
    console.log('Error widget dismissed');
  };

  return (
    <div className="w-full">
      <div className="bg-destructive-50 dark:bg-destructive-900/20 rounded-lg p-4 border border-destructive-200 dark:border-destructive-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive-600 dark:text-destructive-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-destructive-900 dark:text-destructive-100 mb-1">
              {message}
            </h4>
            {error && (
              <p className="text-sm text-destructive-700 dark:text-destructive-300 mb-3">
                {error}
              </p>
            )}
            {operation && (
              <p className="text-xs text-destructive-600 dark:text-destructive-400 mb-3">
                Failed while {getOperationText()}
              </p>
            )}
            <div className="flex gap-2">
              {retry && (
                <button
                  onClick={retry}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium 
                           text-destructive-700 dark:text-destructive-300 
                           bg-white dark:bg-neutral-800 border border-destructive-300 dark:border-destructive-700 
                           rounded-md hover:bg-destructive-50 dark:hover:bg-neutral-700 
                           focus:outline-none focus:ring-2 focus:ring-destructive-500 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium 
                         text-destructive-700 dark:text-destructive-300 
                         hover:text-destructive-900 dark:hover:text-destructive-100 
                         transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}