'use client';

import { Loader2 } from 'lucide-react';

interface LoadingWidgetProps {
  message: string;
  operation?: 'create' | 'update' | 'delete' | 'move' | 'swap' | 'copy';
}

export function LoadingWidget({ message }: LoadingWidgetProps) {
  return (
    <div className="w-full px-2 rounded-lg bg-muted/20">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{message}</span>
      </div>
    </div>
  );
}