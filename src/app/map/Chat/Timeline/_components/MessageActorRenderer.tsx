import type { Message } from '~/app/map/Chat/_state';
import { useEffect, useState } from 'react';
import { loggers } from '~/lib/debug/debug-logger';
import { TimestampRenderer } from '~/app/map/Chat/Timeline/_components/TimestampRenderer';
import { useUserClickHandler } from '~/app/map/Chat/Timeline/_utils/UserClickHandler';
import { MarkdownRenderer } from '~/app/map/Chat/Timeline/_components/MarkdownRenderer';
import { CopyButton } from '~/app/map/Chat/Timeline/_components/CopyButton';
import { CollapsiblePrompt } from '~/app/map/Chat/Timeline/_components/CollapsiblePrompt';
import { authClient } from '~/lib/auth';
import { useEventBus } from '~/app/map/Services/EventBus';
import { ThinkingIndicator } from '~/app/map/Chat/Timeline/_components/ThinkingIndicator';

interface StreamingMessage extends Message {
  isStreaming?: boolean;
}

interface MessageActorRendererProps {
  message: StreamingMessage;
}

export function MessageActorRenderer({ message }: MessageActorRendererProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const eventBus = useEventBus();
  const { handleUserClick } = useUserClickHandler();

  // Track authentication state via EventBus
  useEffect(() => {
    void authClient.getSession().then(session => {
      setIsAuthenticated(!!session?.data?.user);
    });

    const unsubscribe = eventBus.on('auth.*', (event) => {
      if (event.type === 'auth.login') {
        setIsAuthenticated(true);
      }
      if (event.type === 'auth.logout') {
        setIsAuthenticated(false);
      }
    });

    return unsubscribe;
  }, [eventBus]);
  
  // Debug logging for MessageActorRenderer renders
  useEffect(() => {
    loggers.render.chat('MessageActorRenderer rendered', {
      messageId: message.id,
      actor: message.actor,
      contentLength: message.content.length,
      isAuthenticated
    });
  });

  const renderActorLabel = () => {
    if (message.actor === 'user') {
      return (
        <button
          onClick={handleUserClick}
          className="font-bold text-secondary hover:underline focus:outline-none"
        >
          {isAuthenticated ? 'You' : 'Guest'}
        </button>
      );
    }
    
    if (message.actor === 'assistant') {
      return <span className="font-bold text-primary">HexFrame</span>;
    }
    
    return null;
  };

  const renderCopyButtons = () => {
    const content = message.content ?? '';
    if (!content.includes('{{COPY_BUTTON:')) return null;
    
    const regex = /\{\{COPY_BUTTON:([^}]+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    
    return (
      <div className="mt-2">
        {matches.map((match, index) => {
          if (match[1]) {
            return <CopyButton key={index} base64Content={match[1]} />;
          }
          return null;
        })}
      </div>
    );
  };
  
  // Different background colors based on actor
  const getBackgroundClass = () => {
    switch (message.actor) {
      case 'user':
        return 'bg-secondary/5 dark:bg-secondary/10';
      case 'assistant':
        return 'bg-primary/5 dark:bg-primary/10';
      case 'system':
        return 'bg-muted/20';
      default:
        return 'bg-muted/20';
    }
  };

  // System messages have a different layout
  if (message.actor === 'system') {
    return (
      <div className={`w-full px-2 rounded-lg ${getBackgroundClass()}`}>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <TimestampRenderer timestamp={message.timestamp} />
          <span className="text-muted-foreground">•</span>
          <MarkdownRenderer 
            content={message.content} 
            isSystemMessage={true} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full p-4 my-2 rounded-lg ${getBackgroundClass()}`}>
      <div className="text-sm">
        <div className="flex items-center gap-1 mb-1">
          <span className="font-medium">
            {renderActorLabel()}
          </span>
          <span className="text-muted-foreground">-</span>
          <span className="text-xs text-muted-foreground">
            <TimestampRenderer timestamp={message.timestamp} />
          </span>
        </div>
        <div>
          {message.prompt && <CollapsiblePrompt prompt={message.prompt} />}
          {message.isStreaming && !message.content ? (
            <ThinkingIndicator />
          ) : (
            <MarkdownRenderer
              content={message.content}
              isSystemMessage={false}
            />
          )}
          {renderCopyButtons()}
        </div>
      </div>
    </div>
  );
}