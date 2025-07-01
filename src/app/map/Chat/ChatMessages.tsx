'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, PreviewWidgetData } from './types';
import { PreviewWidget } from './Widgets/PreviewWidget';

interface ChatMessagesProps {
  messages: ChatMessage[];
  expandedPreviewId: string | null;
}

export function ChatMessages({ messages, expandedPreviewId }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div 
      ref={scrollRef}
      data-testid="chat-messages" 
      className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4"
    >
      <SystemMessage />
      
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} isExpanded={message.id === expandedPreviewId} />
      ))}
    </div>
  );
}

function SystemMessage() {
  return (
    <div className="w-full">
      <div className="flex items-start gap-3">
        <span className="font-bold text-primary">Hexframe:</span>
        <div className="flex-1 text-muted-foreground">
          Welcome to Hexframe! Select a tile to explore its content.
        </div>
      </div>
    </div>
  );
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isExpanded: boolean;
}

function ChatMessageItem({ message, isExpanded }: ChatMessageItemProps) {
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
            forceExpanded={isExpanded}
          />
        </div>
      );
    }
  }

  // Handle text content
  const getName = () => {
    switch (message.type) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'Lucy';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  };
  
  const getNameColor = () => {
    return message.type === 'user' ? 'text-secondary' : 'text-primary';
  };
  
  return (
    <div data-testid={testId} className="w-full">
      <div className="flex items-start gap-3">
        <span className={`font-bold ${getNameColor()}`}>{getName()}:</span>
        <div className="flex-1">
          {typeof message.content === 'string' ? (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-transparent prose-code:bg-transparent">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Ensure links open in new tab for security
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  // Remove default paragraph margins for better chat layout
                  p: ({ children }) => <p className="my-0">{children}</p>,
                  // Custom code styling for better light/dark mode support
                  code: ({ node, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <code className="block bg-neutral-400 dark:bg-neutral-700 p-2 rounded overflow-x-auto" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="bg-neutral-400 dark:bg-neutral-700 px-1 py-0.5 rounded" {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-neutral-400 dark:bg-neutral-700 p-4 rounded-lg overflow-x-auto my-2">
                      {children}
                    </pre>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}