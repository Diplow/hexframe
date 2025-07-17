'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Widget } from './_state/types';
import type { Message, TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload } from './_state/_events/event.types';
import { PreviewWidget } from './Widgets/PreviewWidget';
import { CreationWidget } from './Widgets/CreationWidget';
import { LoginWidget } from './Widgets/LoginWidget';
import { ConfirmDeleteWidget } from './Widgets/ConfirmDeleteWidget';
import { LoadingWidget } from './Widgets/LoadingWidget';
import { ErrorWidget } from './Widgets/ErrorWidget';
import { useMapCache } from '../Cache/_hooks/use-map-cache';
import { useAuth } from '~/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useChatSettings } from './_settings/useChatSettings';
import { Calendar } from 'lucide-react';
import { api } from '~/commons/trpc/react';

interface ChatMessagesProps {
  messages: Message[];
  widgets: Widget[];
}

export function ChatMessages({ messages, widgets }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { updateItemOptimistic } = useMapCache();
  const { user } = useAuth();
  const router = useRouter();
  const trpcUtils = api.useUtils();
  const createMapMutation = api.map.user.createDefaultMapForCurrentUser.useMutation();
  useChatSettings(); // This will trigger re-render when settings change
  
  // Debug logging for renders
  // Chat components should not log their own renders to prevent circular dependencies
  
  // Render logging removed
  
  // Monitor auth state and handle login widget removal
  useEffect(() => {
    if (user) {
      // User is now logged in, check if there's a login widget active
      const loginWidget = widgets.find(w => w.type === 'login');
      if (loginWidget) {
        // Login widget removal handled by auth system events
        
        // Get user's map and navigate
        trpcUtils.map.user.getUserMap.fetch().then(async (result) => {
          if (result?.success && result.map?.id) {
            // Check if we have a return URL from before auth
            const returnUrl = sessionStorage.getItem('auth-return-url');
            sessionStorage.removeItem('auth-return-url');
            
            // If we were on a specific map before auth, return there
            if (returnUrl?.includes('/map')) {
              window.location.href = returnUrl;
            } else {
              // Otherwise navigate to user's map
              router.push(`/map?center=${result.map.id}`);
            }
          } else if (!result?.success) {
            // Map doesn't exist, try to create it
            try {
              const createResult = await createMapMutation.mutateAsync();
              if (createResult?.success && createResult.mapId) {
                router.push(`/map?center=${createResult.mapId}`);
                // Welcome message will be shown via system events
              }
            } catch (error) {
              console.error('Failed to create user map:', error);
              console.error('Failed to create user map:', error);
            }
          }
        }).catch(console.error);
      }
    }
  }, [user, widgets, router, trpcUtils, createMapMutation]);
  
  // Auto-scroll to bottom when new messages or widgets are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, widgets]);

  // Group messages by day
  const messagesByDay = messages.reduce((acc, message) => {
    const date = new Date(message.timestamp);
    const dateKey = date.toLocaleDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(message);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-3"
      data-testid="chat-messages"
    >
      {Object.entries(messagesByDay).map(([dateKey, dayMessages]) => (
        <div key={dateKey}>
          <DaySeparator date={new Date(dayMessages[0]?.timestamp ?? Date.now())} />
          {dayMessages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </div>
      ))}
      
      {/* Render active widgets */}
      {widgets.map((widget) => (
        <div key={widget.id} className="w-full">
          {renderWidget(widget, { updateItemOptimistic })}
        </div>
      ))}
    </div>
  );
}

function renderWidget(
  widget: Widget,
  _deps: {
    updateItemOptimistic: ReturnType<typeof useMapCache>['updateItemOptimistic'];
  }
) {
  switch (widget.type) {
    case 'preview':
      const previewData = widget.data as TileSelectedPayload;
      return (
        <PreviewWidget
          tileId={previewData.tileId}
          title={previewData.tileData.title}
          content={previewData.tileData.content ?? ''}
        />
      );
    
    case 'login':
      const loginData = widget.data as AuthRequiredPayload;
      return (
        <LoginWidget
          message={loginData.reason}
        />
      );
    
    case 'error':
      const errorData = widget.data as ErrorOccurredPayload;
      return (
        <ErrorWidget
          message={errorData.error}
          error={errorData.context ? JSON.stringify(errorData.context) : undefined}
          retry={errorData.retryable ? () => {
            // Retry logic could be implemented here
            // Retry requested
          } : undefined}
        />
      );
    
    case 'creation': {
      const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string };
      return (
        <CreationWidget
          coordId={creationData.coordId ?? ''}
          parentName={creationData.parentName}
          parentCoordId={creationData.parentCoordId}
        />
      );
    }
    
    case 'loading': {
      const loadingData = widget.data as { message?: string; operation?: string };
      return (
        <LoadingWidget
          message={loadingData.message ?? 'Loading...'}
          operation={loadingData.operation as 'create' | 'update' | 'delete' | 'move' | 'swap' | undefined}
        />
      );
    }
    
    case 'delete': {
      const deleteData = widget.data as { tileId?: string; tileName?: string; tile?: { id: string; title: string; coordId: string } };
      return (
        <ConfirmDeleteWidget
          tileId={deleteData.tileId ?? deleteData.tile?.id ?? ''}
          tileName={deleteData.tileName ?? deleteData.tile?.title ?? 'item'}
        />
      );
    }
    
    default:
      return null;
  }
}


function DaySeparator({ date }: { date: Date }) {
  const formatDate = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return 'Today';
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };
  
  return (
    <div 
      className="flex items-center justify-center gap-2 my-4 text-xs text-muted-foreground"
      title={date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    >
      <Calendar className="w-3 h-3" />
      <span data-testid="chat-day-separator">{formatDate()}</span>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const { user } = useAuth();
  const router = useRouter();
  
  // MessageItem render logging removed to prevent circular dependencies
  
  // Add delay to prevent race condition during registration
  const [canQueryUserMap, setCanQueryUserMap] = React.useState(false);
  
  React.useEffect(() => {
    if (!!user) {
      // Delay to ensure map is created during registration flow
      const timer = setTimeout(() => {
        setCanQueryUserMap(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setCanQueryUserMap(false);
    }
  }, [user]);
  
  // Get the user's actual map ID
  const { data: userMapData } = api.map.user.getUserMap.useQuery(undefined, {
    enabled: canQueryUserMap,
  });
  
  const getTimestamp = () => {
    const date = new Date(message.timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const short = `${hours}:${minutes}`;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const full = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    
    return { short, full };
  };
  
  const timestamps = getTimestamp();
  
  const handleUserClick = () => {
    if (user && userMapData?.success && userMapData.map?.id) {
      // Navigate to user's own map using the router
      const mapUrl = `/map?center=${userMapData.map.id}`;
      // Navigating to user map
      router.push(mapUrl);
      // Navigation events will be handled by the map system
    } else if (user && (!userMapData || !userMapData.success)) {
      // User exists but doesn't have a map yet
      // Map creation message will be shown via system events
    } else {
      // Auth required events are handled by the auth system
    }
  };
  
  
  return (
    <div className="w-full">
      <div className="text-sm whitespace-pre-wrap">
        <span className="text-xs text-muted-foreground mr-2" title={timestamps.full}>
          {timestamps.short}
        </span>
        {message.actor === 'user' && (
          <button
            onClick={handleUserClick}
            className="font-bold text-secondary mr-2 hover:underline focus:outline-none"
          >
            {user ? 'You:' : 'Guest (you):'}
          </button>
        )}
        {message.actor === 'assistant' && (
          <span className="font-bold text-primary mr-2">Lucy:</span>
        )}
        {message.actor === 'system' && (
          <span className="font-bold text-muted-foreground mr-2">System:</span>
        )}
        <span className={message.actor === 'system' ? 'text-muted-foreground' : ''}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
            p: ({ children }) => <>{children}</>,
            br: () => <br />,
            ul: ({ children }) => <ul className="list-disc list-inside mb-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
            li: ({ children }) => <li className="ml-2">{children}</li>,
            strong: ({ children }) => (
              <strong className={`font-semibold ${message.actor === 'system' ? 'text-muted-foreground' : 'text-foreground'}`}>{children}</strong>
            ),
            a: ({ href, children }) => {
              // Regular link
              return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            },
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              const mutedStyle = message.actor === 'system' 
                ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400' 
                : 'bg-neutral-400 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100';
              
              return isInline ? (
                <code className={`${mutedStyle} px-1 py-0.5 rounded`} {...props}>
                  {children}
                </code>
              ) : (
                <pre className={`${mutedStyle} p-4 rounded-lg overflow-x-auto my-2`}>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
        </span>
      </div>
    </div>
  );
}