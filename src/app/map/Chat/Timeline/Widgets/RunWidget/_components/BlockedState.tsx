'use client';

import { useState } from 'react';
import { AlertTriangle, Play, Square, Code2, FileText, Wrench } from 'lucide-react';
import { CollapsibleSection } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/CollapsibleSection';
import { HexplanEditor } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/HexplanEditor';
import type { ToolCallDisplay } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList';

interface HexplanData {
  runId: string;
  coords: string;
  content: string;
}

interface BlockedStateProps {
  blockageReason: string | null;
  currentPrompt?: string | null;
  currentStepHexplan?: HexplanData | null;
  parentHexplan?: HexplanData | null;
  currentToolCalls?: ToolCallDisplay[];
  onResumeRun: () => void;
  onResumeWithInput?: (input: string) => void;
  onStop?: () => void;
}

function _ToolCallsDisplay({ toolCalls }: { toolCalls: ToolCallDisplay[] }) {
  return (
    <div className="space-y-2 p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-md">
      {toolCalls.map((toolCall) => (
        <div key={toolCall.toolCallId} className="text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-purple-700 dark:text-purple-300">
              {toolCall.toolName}
            </span>
            {toolCall.durationMs !== undefined && (
              <span className="text-purple-500 dark:text-purple-400">
                {toolCall.durationMs}ms
              </span>
            )}
          </div>
          {toolCall.arguments && (
            <details className="mb-1">
              <summary className="cursor-pointer text-purple-600 dark:text-purple-400 hover:underline">
                Arguments
              </summary>
              <pre className="mt-1 p-1 bg-purple-100 dark:bg-purple-900/50 rounded font-mono text-purple-700 dark:text-purple-300 whitespace-pre-wrap break-words max-h-[80px] overflow-y-auto">
                {toolCall.arguments}
              </pre>
            </details>
          )}
          {toolCall.result && (
            <details>
              <summary className="cursor-pointer text-green-600 dark:text-green-400 hover:underline">
                Result
              </summary>
              <pre className="mt-1 p-1 bg-green-100 dark:bg-green-900/50 rounded font-mono text-green-700 dark:text-green-300 whitespace-pre-wrap break-words max-h-[80px] overflow-y-auto">
                {toolCall.result}
              </pre>
            </details>
          )}
          {toolCall.error && (
            <div className="text-destructive">
              <span className="font-medium">Error: </span>
              <span>{toolCall.error}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function BlockedState({
  blockageReason,
  currentPrompt,
  currentStepHexplan,
  parentHexplan,
  currentToolCalls,
  onResumeRun,
  onResumeWithInput,
  onStop,
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleResume();
    }
  };

  const hasToolCalls = currentToolCalls && currentToolCalls.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Compact alert */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-secondary/10 border border-secondary/30 rounded-md">
        <AlertTriangle className="h-3.5 w-3.5 text-secondary flex-shrink-0" />
        <span className="text-xs font-medium text-secondary truncate">
          Blocked{blockageReason ? `: ${blockageReason}` : ''}
        </span>
      </div>

      {/* Collapsible sections */}
      <div className="flex flex-col gap-1">
        {currentPrompt && (
          <CollapsibleSection
            title="Prompt"
            icon={<Code2 className="h-3.5 w-3.5" />}
            iconColorClass="text-neutral-500"
          >
            <pre className="max-h-[120px] overflow-y-auto p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words">
              {currentPrompt}
            </pre>
          </CollapsibleSection>
        )}

        {currentStepHexplan && (
          <CollapsibleSection
            title="Current Hexplan"
            icon={<FileText className="h-3.5 w-3.5" />}
            iconColorClass="text-amber-500"
          >
            <HexplanEditor
              label=""
              runId={currentStepHexplan.runId}
              coords={currentStepHexplan.coords}
              content={currentStepHexplan.content}
            />
          </CollapsibleSection>
        )}

        {parentHexplan && (
          <CollapsibleSection
            title="Parent Hexplan"
            icon={<FileText className="h-3.5 w-3.5" />}
            iconColorClass="text-amber-400"
          >
            <HexplanEditor
              label=""
              runId={parentHexplan.runId}
              coords={parentHexplan.coords}
              content={parentHexplan.content}
            />
          </CollapsibleSection>
        )}

        {hasToolCalls && (
          <CollapsibleSection
            title={`Tool Calls (${currentToolCalls.length})`}
            icon={<Wrench className="h-3.5 w-3.5" />}
            iconColorClass="text-purple-500"
          >
            <_ToolCallsDisplay toolCalls={currentToolCalls} />
          </CollapsibleSection>
        )}
      </div>

      {/* Compact input with inline buttons */}
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={resumeInput}
          onChange={(event) => setResumeInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add context (optional)..."
          className="flex-1 px-2.5 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={handleResume}
          className="flex items-center justify-center p-1.5 text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
          title={resumeInput.trim() ? 'Resume with context' : 'Resume'}
        >
          <Play className="h-4 w-4" />
        </button>
        {onStop && (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center justify-center p-1.5 text-neutral-600 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-md transition-colors"
            title="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
