'use client';

import { cn } from '~/lib/utils';
import { useChat } from './ChatProvider';
import { ChatMessages } from './ChatMessages';
import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  const { state, dispatch } = useChat();

  return (
    <div data-testid="chat-panel" className={cn('flex flex-col h-full', className)}>
      <ChatHeader onClose={() => dispatch({ type: 'CLOSE_CHAT' })} />
      <ChatMessages messages={state.messages} />
    </div>
  );
}

interface ChatHeaderProps {
  onClose: () => void;
}

function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h2 className="text-lg font-semibold">Chat</h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close chat"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}