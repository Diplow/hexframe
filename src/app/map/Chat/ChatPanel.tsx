'use client';

import { cn } from '~/lib/utils';
import { useChat } from './ChatProvider';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  const { state } = useChat();

  return (
    <div data-testid="chat-panel" className={cn('flex flex-col h-full bg-center-depth-0', className)}>
      <ChatHeader />
      <ChatMessages messages={state.messages} expandedPreviewId={state.expandedPreviewId} />
      <ChatInput />
    </div>
  );
}

function ChatHeader() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-[color:var(--stroke-color-950)]">
      <h2 className="text-lg font-semibold">Chat</h2>
    </div>
  );
}