'use client';

import { useState } from 'react';
import { Loader2, Check, X, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';

interface ToolCallWidgetProps {
  toolName: string;
  arguments: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  result?: string;
}

function formatToolName(toolName: string): string {
  // Remove common prefixes for cleaner display
  // e.g., "mcp__hexframe__addItem" -> "addItem"
  const parts = toolName.split('__');
  return parts[parts.length - 1] ?? toolName;
}

function StatusIcon({ status }: { status: 'running' | 'completed' | 'failed' }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-link" />;
    case 'completed':
      return <Check className="h-3.5 w-3.5 text-success" />;
    case 'failed':
      return <X className="h-3.5 w-3.5 text-destructive" />;
  }
}

function CollapsibleSection({
  title,
  content,
  defaultOpen = false
}: {
  title: string;
  content: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!content) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>{title}</span>
      </button>
      {isOpen && (
        <pre className="mt-1 text-xs bg-muted/30 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
          {content}
        </pre>
      )}
    </div>
  );
}

export function ToolCallWidget({
  toolName,
  arguments: toolArguments,
  status,
  result
}: ToolCallWidgetProps) {
  const displayName = formatToolName(toolName);
  const argumentsJson = JSON.stringify(toolArguments, null, 2);

  return (
    <div
      className={cn(
        'w-full px-3 py-2 rounded-lg border',
        status === 'running' && 'bg-link/5 border-link/20',
        status === 'completed' && 'bg-success/5 border-success/20',
        status === 'failed' && 'bg-destructive/5 border-destructive/20'
      )}
    >
      <div className="flex items-center gap-2">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">{displayName}</span>
        <StatusIcon status={status} />
        <span className="text-xs text-muted-foreground ml-auto">
          {toolName !== displayName && toolName}
        </span>
      </div>

      <CollapsibleSection title="Arguments" content={argumentsJson} />

      {result && (
        <CollapsibleSection
          title={status === 'failed' ? 'Error' : 'Result'}
          content={result}
          defaultOpen={status === 'failed'}
        />
      )}
    </div>
  );
}
