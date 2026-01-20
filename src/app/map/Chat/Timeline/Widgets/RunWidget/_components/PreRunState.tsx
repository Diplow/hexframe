'use client';

import { Play } from 'lucide-react';

interface PreRunStateProps {
  instruction: string;
  onInstructionChange: (value: string) => void;
  onStartRun: () => void;
  isStarting?: boolean;
}

export function PreRunState({
  instruction,
  onInstructionChange,
  onStartRun,
  isStarting = false,
}: PreRunStateProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label
          htmlFor="run-instruction"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          Instructions (optional)
        </label>
        <textarea
          id="run-instruction"
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder="Add specific instructions for this run..."
          className="w-full h-20 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          disabled={isStarting}
        />
      </div>
      <button
        type="button"
        onClick={onStartRun}
        disabled={isStarting}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed rounded-md transition-colors"
      >
        <Play className="h-4 w-4" />
        {isStarting ? 'Starting...' : 'Start Run'}
      </button>
    </div>
  );
}
