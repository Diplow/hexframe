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
      return <span className="font-bold text-primary-light">HexFrame</span>;
    }
    
    if (message.actor === 'system') {
      return <span className="font-bold text-muted-foreground">System</span>;
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
  
  return (
    <div className="w-full">
      <div className="text-sm flex items-start gap-2">
        <span className="text-xs text-muted-foreground shrink-0">
          <TimestampRenderer timestamp={message.timestamp} />
        </span>
        <span className="font-medium shrink-0">
          {renderActorLabel()}
        </span>
        <div className="flex-1">
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