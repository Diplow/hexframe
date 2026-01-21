'use client';

import type { ExpandedSection, ExecutedStep, ToolCallDisplay } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList/types';

interface ExpandedContentProps {
  expandedSection: ExpandedSection;
  step: ExecutedStep;
}

function _ToolCallItem({ toolCall }: { toolCall: ToolCallDisplay }) {
  return (
    <div className="p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded text-xs">
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
          <pre className="mt-1 p-1 bg-purple-100 dark:bg-purple-900/50 rounded font-mono text-purple-700 dark:text-purple-300 whitespace-pre-wrap break-words max-h-[100px] overflow-y-auto">
            {toolCall.arguments}
          </pre>
        </details>
      )}
      {toolCall.result && (
        <details>
          <summary className="cursor-pointer text-green-600 dark:text-green-400 hover:underline">
            Result
          </summary>
          <pre className="mt-1 p-1 bg-green-100 dark:bg-green-900/50 rounded font-mono text-green-700 dark:text-green-300 whitespace-pre-wrap break-words max-h-[100px] overflow-y-auto">
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
  );
}

export function ExpandedContent({ expandedSection, step }: ExpandedContentProps) {
  if (expandedSection === 'prompt' && step.prompt) {
    return (
      <div className="px-2 pb-2">
        <pre className="max-h-[150px] overflow-y-auto p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words">
          {step.prompt}
        </pre>
      </div>
    );
  }

  if (expandedSection === 'response' && step.agentResponse) {
    return (
      <div className="px-2 pb-2">
        <pre className="max-h-[150px] overflow-y-auto p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded text-xs font-mono text-blue-700 dark:text-blue-300 whitespace-pre-wrap break-words">
          {step.agentResponse}
        </pre>
      </div>
    );
  }

  if (expandedSection === 'hexplan' && step.hexplanContent) {
    return (
      <div className="px-2 pb-2">
        <pre className="max-h-[150px] overflow-y-auto p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded text-xs font-mono text-amber-700 dark:text-amber-300 whitespace-pre-wrap break-words">
          {step.hexplanContent}
        </pre>
      </div>
    );
  }

  if (expandedSection === 'toolCalls' && step.toolCalls && step.toolCalls.length > 0) {
    return (
      <div className="px-2 pb-2 space-y-2">
        {step.toolCalls.map((toolCall) => (
          <_ToolCallItem key={toolCall.toolCallId} toolCall={toolCall} />
        ))}
      </div>
    );
  }

  return null;
}
