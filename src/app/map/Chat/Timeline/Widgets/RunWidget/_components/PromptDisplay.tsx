'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Code } from 'lucide-react';

interface PromptDisplayProps {
  prompt: string;
  defaultExpanded?: boolean;
}

export function PromptDisplay({
  prompt,
  defaultExpanded = false,
}: PromptDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!prompt) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Code className="h-4 w-4" />
        <span>{isExpanded ? 'Hide Prompt' : 'Show Prompt'}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3">
          <pre className="max-h-[200px] overflow-y-auto p-3 bg-neutral-50 dark:bg-neutral-900 rounded-md text-xs font-mono text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
