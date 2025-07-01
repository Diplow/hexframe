'use client';

import { cn } from '~/lib/utils';
import type { ChatMessage } from './types';
import { PreviewWidget } from './Widgets/PreviewWidget';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div data-testid="chat-messages" className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && <SystemMessage />}
      
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}

function SystemMessage() {
  return (
    <div className="text-center text-muted-foreground py-8">
      Welcome to Hexframe! Select a tile to explore its content.
    </div>
  );
}

interface ChatMessageItemProps {
  message: ChatMessage;
}

function ChatMessageItem({ message }: ChatMessageItemProps) {
  const testId = `chat-message-${message.id}`;

  if (message.type === 'system' && typeof message.content === 'object') {
    // Handle widget content
    if (message.content.type === 'preview') {
      return (
        <div data-testid={testId}>
          <PreviewWidget
            tileId={message.content.data.tileId}
            title={message.content.data.title}
            content={message.content.data.content}
          />
        </div>
      );
    }
  }

  // Handle text content
  return (
    <div 
      data-testid={testId}
      className={cn(
        'rounded-lg p-3',
        message.type === 'system' && 'text-muted-foreground'
      )}
    >
      {typeof message.content === 'string' ? message.content : null}
    </div>
  );
}