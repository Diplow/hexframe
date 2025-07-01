'use client';

import { cn } from '~/lib/utils';
import type { ChatMessage, PreviewWidgetData } from './types';
import { PreviewWidget } from './Widgets/PreviewWidget';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div data-testid="chat-messages" className="flex-1 overflow-y-auto flex flex-col">
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
      const widgetData = message.content.data as PreviewWidgetData;
      return (
        <div data-testid={testId} className="flex-1 p-4">
          <PreviewWidget
            tileId={widgetData.tileId}
            title={widgetData.title}
            content={widgetData.content}
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