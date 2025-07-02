'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, PreviewWidgetData } from './types';
import { PreviewWidget } from './Widgets/PreviewWidget';
import { useMapCache } from '../Cache/_hooks/use-map-cache';
import { DeleteItemDialog } from '../Dialogs/delete-item';
import type { TileData } from '../types/tile-data';
import { useChat } from './ChatProvider';

interface ChatMessagesProps {
  messages: ChatMessage[];
  expandedPreviewId: string | null;
}

export function ChatMessages({ messages, expandedPreviewId }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { dispatch } = useChat();
  
  // Dialog state
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
            onDeleteTile={setDeletingTile}
          />
        ))}
        
        {/* Spacer to ensure last message isn't too close to bottom */}
        <div className="h-2" />
      </div>
      
      {/* Dialogs */}
      {deletingTile && (
        <DeleteItemDialog
          isOpen={!!deletingTile}
          onClose={() => setDeletingTile(null)}
          item={deletingTile}
          onSuccess={() => {
            // Remove the preview from chat when the item is deleted
            if (deletingTile) {
              dispatch({ 
                type: 'REMOVE_TILE_PREVIEW', 
                payload: { tileId: deletingTile.metadata.coordId } 
              });
            }
            setDeletingTile(null);
          }}
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
  onDeleteTile: (tile: TileData) => void;
}

function ChatMessageItem({ message, isExpanded, onDeleteTile }: ChatMessageItemProps) {
  const { items, updateItemOptimistic } = useMapCache();
  const testId = `chat-message-${message.id}`;

  if (message.type === 'system' && typeof message.content === 'object') {
    // Handle widget content
    if (message.content.type === 'preview') {
      const widgetData = message.content.data as PreviewWidgetData;
      const tileData = items[widgetData.tileId];
      
      const handleSave = async (newTitle: string, newContent: string) => {
        if (!tileData) return;
        
        // The cache handles everything:
        // 1. Optimistic update (immediate UI feedback)
        // 2. Server call (via tRPC mutation)
        // 3. localStorage sync
        // 4. Rollback on error
        try {
          await updateItemOptimistic(tileData.metadata.coordId, {
            name: newTitle,
            description: newContent,
          });
        } catch (error) {
          console.error('Failed to update item:', error);
        }
      };
      
      return (
        <div data-testid={testId} className="w-full">
          <PreviewWidget
            tileId={widgetData.tileId}
            title={widgetData.title}
            content={widgetData.content}
            forceExpanded={isExpanded}
            onEdit={tileData ? undefined : undefined} // Inline editing is handled by onSave
            onDelete={tileData ? () => onDeleteTile(tileData) : undefined}
            onSave={tileData ? handleSave : undefined}
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
                    const match = /language-(\w+)/.exec((className as string) ?? '');
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