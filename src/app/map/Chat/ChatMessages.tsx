'use client';

import { cn } from '~/lib/utils';
import type { ChatMessage, PreviewWidgetData } from './types';
import { PreviewWidget } from './Widgets/PreviewWidget';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const showSystemMessage = messages.length === 0 || 
    !messages.some(m => m.type === 'system' && typeof m.content === 'object');
    
  return (
    <div data-testid="chat-messages" className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4">
      {showSystemMessage && <SystemMessage />}
      
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}

function SystemMessage() {
  return (
    <div className="w-full text-center text-muted-foreground py-8 px-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
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
        <div data-testid={testId} className="w-full">
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
        'w-full rounded-lg p-3',
        message.type === 'system' && 'text-muted-foreground bg-neutral-50 dark:bg-neutral-900/50'
      )}
    >
      {typeof message.content === 'string' ? message.content : null}
    </div>
  );
}