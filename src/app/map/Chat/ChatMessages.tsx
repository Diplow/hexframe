'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, PreviewWidgetData } from './types';
import { PreviewWidget } from './Widgets/PreviewWidget';
import { useMapCache } from '../Cache/_hooks/use-map-cache';
import { UpdateItemDialog } from '../Dialogs/update-item';
import { DeleteItemDialog } from '../Dialogs/delete-item';
import type { TileData } from '../types/tile-data';

interface ChatMessagesProps {
  messages: ChatMessage[];
  expandedPreviewId: string | null;
}

export function ChatMessages({ messages, expandedPreviewId }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Dialog state
  const [editingTile, setEditingTile] = useState<TileData | null>(null);
  const [deletingTile, setDeletingTile] = useState<TileData | null>(null);
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <>
      <div 
        ref={scrollRef}
        data-testid="chat-messages" 
        className="flex-1 overflow-y-auto flex flex-col px-4 py-6 space-y-4"
      >
        <SystemMessage />
        
        {messages.map((message) => (
          <ChatMessageItem 
            key={message.id} 
            message={message} 
            isExpanded={message.id === expandedPreviewId}
            onEditTile={setEditingTile}
            onDeleteTile={setDeletingTile}
          />
        ))}
        
        {/* Spacer to ensure last message isn't too close to bottom */}
        <div className="h-2" />
      </div>
      
      {/* Dialogs */}
      {editingTile && (
        <UpdateItemDialog
          isOpen={!!editingTile}
          onClose={() => setEditingTile(null)}
          item={editingTile}
          onSuccess={() => setEditingTile(null)}
        />
      )}
      {deletingTile && (
        <DeleteItemDialog
          isOpen={!!deletingTile}
          onClose={() => setDeletingTile(null)}
          item={deletingTile}
          onSuccess={() => setDeletingTile(null)}
        />
      )}
    </>
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
  onEditTile: (tile: TileData) => void;
  onDeleteTile: (tile: TileData) => void;
}

function ChatMessageItem({ message, isExpanded, onEditTile, onDeleteTile }: ChatMessageItemProps) {
  const { items } = useMapCache();
  const testId = `chat-message-${message.id}`;

  if (message.type === 'system' && typeof message.content === 'object') {
    // Handle widget content
    if (message.content.type === 'preview') {
      const widgetData = message.content.data as PreviewWidgetData;
      const tileData = items[widgetData.tileId];
      
      return (
        <div data-testid={testId} className="w-full">
          <PreviewWidget
            tileId={widgetData.tileId}
            title={widgetData.title}
            content={widgetData.content}
            forceExpanded={isExpanded}
            onEdit={tileData ? () => onEditTile(tileData) : undefined}
            onDelete={tileData ? () => onDeleteTile(tileData) : undefined}
          />
        </div>
      );
    }
  }

  // Check if this is a navigation message
  const isNavigationMessage = message.type === 'system' && 
    typeof message.content === 'string' && 
    message.content.includes('📍 Navigated to');
  
  // Handle navigation messages with special styling
  if (isNavigationMessage) {
    return <NavigationMessage message={message} testId={testId} />;
  }
  
  // Handle other text content
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
            <div className="prose prose-sm max-w-none dark:prose-invert">
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
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className as string ?? '');
                    return match ? (
                      <code className="block bg-neutral-400 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 p-2 rounded overflow-x-auto" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="bg-neutral-400 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-1 py-0.5 rounded" {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-neutral-400 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 p-4 rounded-lg overflow-x-auto my-2">
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

// Navigation message component with clickable tile name
interface NavigationMessageProps {
  message: ChatMessage;
  testId: string;
}

function NavigationMessage({ message, testId }: NavigationMessageProps) {
  const { navigateToItem } = useMapCache();
  
  // Extract the coordId from metadata
  const tileCoordId = message.metadata?.tileId;
  
  const handleNavigation = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (tileCoordId) {
      await navigateToItem(tileCoordId);
    }
  };
  
  return (
    <div data-testid={testId} className="w-full">
      <div className="text-xs text-muted-foreground italic">
        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-muted-foreground">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="my-0">{children}</p>,
              strong: ({ children }) => (
                <strong 
                  className="font-semibold cursor-pointer hover:underline"
                  onClick={handleNavigation}
                >
                  {children}
                </strong>
              ),
            }}
          >
            {message.content as string}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}