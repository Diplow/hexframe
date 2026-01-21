'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, Code2, MessageSquare, FileText, Wrench } from 'lucide-react';
import type { ExecutedStep } from '~/app/map/Chat/Timeline/Widgets/RunWidget/useRunWidget';

interface StepsListProps {
  steps: ExecutedStep[];
  onNavigateToTile?: (coords: string) => void;
}

function _getStatusIcon(status: ExecutedStep['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case 'blocked':
      return <AlertTriangle className="h-3.5 w-3.5 text-secondary" />;
    case 'error':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  }
}

interface StepItemProps {
  step: ExecutedStep;
  onNavigateToTile?: (coords: string) => void;
}

type ExpandedSection = 'none' | 'prompt' | 'response' | 'hexplan' | 'toolCalls';

function StepItem({ step, onNavigateToTile }: StepItemProps) {
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>('none');

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(expandedSection === section ? 'none' : section);
  };

  const hasPrompt = Boolean(step.prompt);
  const hasResponse = Boolean(step.agentResponse);
  const hasHexplan = Boolean(step.hexplanContent);
  const hasToolCalls = Boolean(step.toolCalls && step.toolCalls.length > 0);

  return (
    <li className="flex flex-col bg-neutral-50 dark:bg-neutral-800/50 rounded-md text-sm">
      <div className="flex items-center gap-2 p-2">
        {_getStatusIcon(step.status)}
        <button
          type="button"
          onClick={() => onNavigateToTile?.(step.coords)}
          className="flex items-center gap-1 text-primary hover:underline truncate"
        >
          <span className="truncate">{step.title}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          {hasPrompt && (
            <button
              type="button"
              onClick={() => toggleSection('prompt')}
              className={`p-1 rounded transition-colors ${
                expandedSection === 'prompt'
                  ? 'text-neutral-700 dark:text-neutral-200 bg-neutral-200 dark:bg-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
              }`}
              title="Show prompt"
            >
              <Code2 className="h-3 w-3" />
            </button>
          )}
          {hasResponse && (
            <button
              type="button"
              onClick={() => toggleSection('response')}
              className={`p-1 rounded transition-colors ${
                expandedSection === 'response'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50'
                  : 'text-neutral-400 hover:text-blue-500 dark:hover:text-blue-400'
              }`}
              title="Show agent response"
            >
              <MessageSquare className="h-3 w-3" />
            </button>
          )}
          {hasHexplan && (
            <button
              type="button"
              onClick={() => toggleSection('hexplan')}
              className={`p-1 rounded transition-colors ${
                expandedSection === 'hexplan'
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50'
                  : 'text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400'
              }`}
              title="Show hexplan"
            >
              <FileText className="h-3 w-3" />
            </button>
          )}
          {hasToolCalls && (
            <button
              type="button"
              onClick={() => toggleSection('toolCalls')}
              className={`p-1 rounded transition-colors ${
                expandedSection === 'toolCalls'
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50'
                  : 'text-neutral-400 hover:text-purple-500 dark:hover:text-purple-400'
              }`}
              title="Show tool calls"
            >
              <Wrench className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {expandedSection === 'prompt' && step.prompt && (
        <div className="px-2 pb-2">
          <pre className="max-h-[150px] overflow-y-auto p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words">
            {step.prompt}
          </pre>
        </div>
      )}
      {expandedSection === 'response' && step.agentResponse && (
        <div className="px-2 pb-2">
          <pre className="max-h-[150px] overflow-y-auto p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded text-xs font-mono text-blue-700 dark:text-blue-300 whitespace-pre-wrap break-words">
            {step.agentResponse}
          </pre>
        </div>
      )}
      {expandedSection === 'hexplan' && step.hexplanContent && (
        <div className="px-2 pb-2">
          <pre className="max-h-[150px] overflow-y-auto p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded text-xs font-mono text-amber-700 dark:text-amber-300 whitespace-pre-wrap break-words">
            {step.hexplanContent}
          </pre>
        </div>
      )}
      {expandedSection === 'toolCalls' && step.toolCalls && step.toolCalls.length > 0 && (
        <div className="px-2 pb-2 space-y-2">
          {step.toolCalls.map((toolCall) => (
            <div
              key={toolCall.toolCallId}
              className="p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded text-xs"
            >
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
          ))}
        </div>
      )}
    </li>
  );
}

export function StepsList({ steps, onNavigateToTile }: StepsListProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        Executed Steps
      </span>
      <ul className="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
        {steps.map((step, index) => (
          <StepItem
            key={`${step.coords}-${index}`}
            step={step}
            onNavigateToTile={onNavigateToTile}
          />
        ))}
      </ul>
    </div>
  );
}
