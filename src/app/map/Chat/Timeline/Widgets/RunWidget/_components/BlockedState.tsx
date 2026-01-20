'use client';

import { AlertTriangle, Play } from 'lucide-react';

interface BlockedStateProps {
  blockageReason: string | null;
  onResumeRun: () => void;
}

export function BlockedState({
  blockageReason,
  onResumeRun,
}: BlockedStateProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 p-3 bg-secondary/10 border border-secondary/30 rounded-md">
        <AlertTriangle className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-secondary">
            Execution Blocked
          </span>
          {blockageReason && (
            <span className="text-sm text-secondary/80">
              {blockageReason}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onResumeRun}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
      >
        <Play className="h-4 w-4" />
        Resume
      </button>
    </div>
  );
}
