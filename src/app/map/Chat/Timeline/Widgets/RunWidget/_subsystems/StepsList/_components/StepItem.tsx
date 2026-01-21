'use client';

import { useState } from 'react';
import { ExternalLink, Code2, MessageSquare, FileText, Wrench } from 'lucide-react';
import type { ExecutedStep, ExpandedSection } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList/types';
import { StatusIcon } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList/_components/StatusIcon';
import { ExpandedContent } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList/_components/ExpandedContent';

interface StepItemProps {
  step: ExecutedStep;
  onNavigateToTile?: (coords: string) => void;
}

export function StepItem({ step, onNavigateToTile }: StepItemProps) {
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
        <StatusIcon status={step.status} />
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
      <ExpandedContent expandedSection={expandedSection} step={step} />
    </li>
  );
}
