import { useUnifiedAuth } from '~/contexts/UnifiedAuthContext';
import type { Message } from '../_state/_events/event.types';
import { useEffect } from 'react';
import { loggers } from '~/lib/debug/debug-logger';
import { TimestampRenderer } from './TimestampRenderer';
import { useUserClickHandler } from './UserClickHandler';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from './CopyButton';

interface MessageActorRendererProps {
  message: Message;
}

export function MessageActorRenderer({ message }: MessageActorRendererProps) {
  const { user } = useUnifiedAuth();
  const { handleUserClick } = useUserClickHandler();
  
  // Debug logging for MessageActorRenderer renders
  useEffect(() => {
    loggers.render.chat('MessageActorRenderer rendered', {
      messageId: message.id,
      actor: message.actor,
      contentLength: message.content.length,
      hasUser: !!user
    });
  });

  const renderActorLabel = () => {
    if (message.actor === 'user') {
      return (
        <button
          onClick={handleUserClick}
          className="font-bold text-secondary hover:underline focus:outline-none"
        >
          {user ? 'You' : 'Guest'}
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
      <div className={`w-full p-4 rounded-lg ${getBackgroundClass()}`}>
        <div className="text-xs text-muted-foreground flex items-start gap-1">
          <TimestampRenderer timestamp={message.timestamp} />
          <MarkdownRenderer 
            content={message.content} 
            isSystemMessage={true} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full p-4 rounded-lg ${getBackgroundClass()}`}>
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
          <MarkdownRenderer 
            content={message.content} 
            isSystemMessage={message.actor === 'system'} 
          />
          {renderCopyButtons()}
        </div>
      </div>
    </div>
  );
}