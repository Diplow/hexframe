/**
 * Collapsible prompt display component
 * Shows the hexecute prompt in a collapsed section that users can expand
 */

import { MarkdownRenderer } from '~/app/map/Chat/Timeline/_components/MarkdownRenderer'

interface CollapsiblePromptProps {
  prompt: string
}

export function CollapsiblePrompt({ prompt }: CollapsiblePromptProps) {
  return (
    <details className="mb-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
        Show the prompt
      </summary>
      <div className="mt-2 p-3 bg-muted/50 rounded-md overflow-x-auto max-h-96 overflow-y-auto">
        <MarkdownRenderer content={prompt} isSystemMessage={false} />
      </div>
    </details>
  )
}
