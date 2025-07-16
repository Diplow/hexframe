import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/commons/trpc/react';
import type { Message } from '../Cache/_events/event.types';
import { useMapCache } from '../../Cache/_hooks/use-map-cache';
import { useEventBus } from '../../Services/EventBus/event-bus-context';
import { useEffect, useState } from 'react';
import { loggers } from '~/lib/debug/debug-logger';
import { Copy, Check } from 'lucide-react';

interface MessageActorRendererProps {
  message: Message;
}

export function MessageActorRenderer({ message }: MessageActorRendererProps) {
  const { user } = useAuth();
  const { navigateToItem } = useMapCache();
  const eventBus = useEventBus();
  
  const trpcUtils = api.useUtils();
  
  // Debug logging for MessageActorRenderer renders
  useEffect(() => {
    loggers.render.chat('MessageActorRenderer rendered', {
      messageId: message.id,
      actor: message.actor,
      contentLength: message.content.length,
      hasUser: !!user
    });
  });
  
  // Don't automatically fetch user map data - only fetch when needed for navigation

  const formatTimestamp = () => {
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

  const handleUserClick = async () => {
    if (!user) {
      eventBus.emit({
        type: 'auth.required',
        payload: {
          reason: 'Create an account to have your own map'
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
      return;
    }

    try {
      // Fetch user map data only when clicking on username
      // User clicked on username, fetching map data
      const userMapData = await trpcUtils.map.user.getUserMap.fetch();
      
      if (userMapData?.success && userMapData.map?.id) {
        await _navigateToUserMap(userMapData.map);
      } else {
        eventBus.emit({
          type: 'chat.message_received',
          payload: {
            message: 'Creating your map...',
            actor: 'system'
          },
          source: 'chat_cache',
          timestamp: new Date(),
        });
      }
    } catch (_error) {
      console.warn('Failed to fetch user map:', _error);
      eventBus.emit({
        type: 'chat.message_received',
        payload: {
          message: 'Failed to load your map',
          actor: 'system'
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
    }
  };

  const _navigateToUserMap = async (map: { id: number; name?: string }) => {
    const mapName = map.name ?? user?.name ?? 'Your Map';
    // Navigating to user map
    
    try {
      // Navigate using the database ID
      // The navigation handler will load the map if it's not in cache
      // Calling navigateToItem with database ID
      await navigateToItem(String(map.id));
    } catch (_error) {
      console.warn('Failed to navigate to user map:', _error);
      eventBus.emit({
        type: 'chat.message_received',
        payload: {
          message: `Failed to navigate to ${mapName} map`,
          actor: 'system'
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
    }
  };

  const renderActorLabel = () => {
    if (message.actor === 'user') {
      return (
        <button
          onClick={handleUserClick}
          className="font-bold text-secondary mr-2 hover:underline focus:outline-none"
        >
          {user ? 'You:' : 'Guest (you):'}
        </button>
      );
    }
    
    if (message.actor === 'assistant') {
      return <span className="font-bold text-primary mr-2">Lucy:</span>;
    }
    
    if (message.actor === 'system') {
      return <span className="font-bold text-muted-foreground mr-2">System:</span>;
    }
    
    return null;
  };

  const createMarkdownComponents = () => {
    // Creating markdown components for message
    return {
    p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    br: () => <br />,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-1">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
    li: ({ children, ..._props }: { children?: React.ReactNode } & React.LiHTMLAttributes<HTMLLIElement>) => <li className="ml-2" {..._props}>{children}</li>,
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className={`font-semibold ${message.actor === 'system' ? 'text-muted-foreground' : 'text-foreground'}`}>
        {children}
      </strong>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      // ReactMarkdown anchor component called
      if (href?.startsWith('#hexframe-command:')) {
        // Detected command link, rendering command button
        return _renderCommandButton(href, children);
      }
      // Regular link, rendering normal anchor
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    code: ({ className, children, ..._props }: { className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => {
      const isInline = !className;
      const mutedStyle = message.actor === 'system' 
        ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400' 
        : 'bg-neutral-400 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100';
      
      return isInline ? (
        <code className={`${mutedStyle} px-1 py-0.5 rounded`} {..._props}>
          {children}
        </code>
      ) : (
        <pre className={`${mutedStyle} p-4 rounded-lg overflow-x-auto my-2`}>
          <code className={className} {..._props}>
            {children}
          </code>
        </pre>
      );
    },
  };
  };

  const _renderCommandButton = (href: string, children: React.ReactNode) => {
    const command = href.slice(18); // Remove '#hexframe-command:' prefix
    // Rendering command button
    
    // Extract tooltip for navigation commands
    let tooltip = '';
    if (command.startsWith('navigate:')) {
      const parts = command.split(':');
      if (parts.length >= 3 && parts[2]) {
        tooltip = decodeURIComponent(parts[2]); // Full tile name for tooltip
      }
    }
    
    return (
      <button
        type="button"
        title={tooltip || undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Command button clicked
          // Only dispatch the command execution event
          // The Input component will handle both showing the command and executing it
          eventBus.emit({
            type: 'chat.command',
            payload: {
              command
            },
            source: 'chat_cache',
            timestamp: new Date(),
          });
        }}
        className={`underline transition-colors cursor-pointer bg-transparent border-none p-0 font-inherit ${
          message.actor === 'system' 
            ? 'text-muted-foreground hover:text-foreground' 
            : 'text-primary hover:text-primary/80'
        }`}
      >
        {children}
      </button>
    );
  };

  const timestamps = formatTimestamp();
  
  return (
    <div className="w-full">
      <div className="text-sm whitespace-pre-wrap">
        <span className="text-xs text-muted-foreground mr-2" title={timestamps.full}>
          {timestamps.short}
        </span>
        {renderActorLabel()}
        <span className={message.actor === 'system' ? 'text-muted-foreground' : ''}>
          {(() => {
            const cleanedContent = message.content.replace(/\{\{COPY_BUTTON:[^}]+\}\}/g, '');
            // MessageActorRenderer ReactMarkdown content
            return (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={createMarkdownComponents()}
              >
                {cleanedContent}
              </ReactMarkdown>
            );
          })()}
        </span>
        {/* Render copy buttons after markdown content */}
        {(() => {
          // MessageActorRenderer checking for copy buttons
          
          if (message.content.includes('{{COPY_BUTTON:')) {
            const regex = /\{\{COPY_BUTTON:([^}]+)\}\}/g;
            const matches = message.content.match(regex);
            // MessageActorRenderer found copy button matches
            
            return (
              <div className="mt-2">
                {matches?.map((match, index) => {
                  // MessageActorRenderer processing match
                  const base64Match = regex.exec(match);
                  if (base64Match?.[1]) {
                    // MessageActorRenderer creating CopyButton with base64
                    return <CopyButton key={index} base64Content={base64Match[1]} />;
                  }
                  // MessageActorRenderer no base64 match found
                  return null;
                })}
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}

function CopyButton({ base64Content }: { base64Content: string }) {
  const [copied, setCopied] = useState(false);
  
  // CopyButton rendered with base64 length
  
  const handleCopy = async () => {
    // CopyButton clicked, attempting to copy
    
    try {
      // Decode the base64 content
      const logContent = atob(base64Content);
      
      // Copy to clipboard
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(logContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      } else {
        // Fallback: show content in a prompt (not ideal but works)
        prompt('Copy the content below:', logContent);
      }
    } catch (_error) {
      console.warn('Failed to copy to clipboard:', _error);
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded transition-colors"
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy to clipboard
        </>
      )}
    </button>
  );
}