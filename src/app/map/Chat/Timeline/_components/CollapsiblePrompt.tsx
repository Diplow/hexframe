/**
 * Collapsible prompt display component
 * Shows the hexecute prompt in a collapsed section that users can expand
 * Styled to match the ToolCallWidget appearance
 */

'use client';

import { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from '~/app/map/Chat/Timeline/_components/MarkdownRenderer';

interface CollapsiblePromptProps {
  prompt: string
}

export function CollapsiblePrompt({ prompt }: CollapsiblePromptProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full mb-3 px-3 py-2 rounded-lg border bg-primary/5 border-primary/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">hexecute</span>
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>Backend Prompt</span>
        </span>
      </button>
      {isOpen && (
        <div className="mt-2 p-3 bg-muted/30 rounded-md overflow-x-auto max-h-96 overflow-y-auto">
          <MarkdownRenderer content={prompt} isSystemMessage={false} />
        </div>
      )}
    </div>
  )
}
