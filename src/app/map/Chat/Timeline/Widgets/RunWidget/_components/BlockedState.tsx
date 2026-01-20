'use client';

import { useState } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import { PromptDisplay } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/PromptDisplay';

interface BlockedStateProps {
  blockageReason: string | null;
  currentPrompt?: string | null;
  onResumeRun: () => void;
  onResumeWithInput?: (input: string) => void;
}

export function BlockedState({
  blockageReason,
  currentPrompt,
  onResumeRun,
  onResumeWithInput,
}: BlockedStateProps) {
  const [resumeInput, setResumeInput] = useState('');

  const handleResume = () => {
    if (resumeInput.trim() && onResumeWithInput) {
      onResumeWithInput(resumeInput);
    } else {
      onResumeRun();
    }
    setResumeInput('');
  };

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

      {currentPrompt && <PromptDisplay prompt={currentPrompt} />}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="resume-input"
          className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >
          Add context to help resume (optional)
        </label>
        <textarea
          id="resume-input"
          value={resumeInput}
          onChange={(event) => setResumeInput(event.target.value)}
          placeholder="Provide additional instructions or context..."
          className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          rows={3}
        />
      </div>

      <button
        type="button"
        onClick={handleResume}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
      >
        <Play className="h-4 w-4" />
        {resumeInput.trim() ? 'Resume with Context' : 'Resume'}
      </button>
    </div>
  );
}
