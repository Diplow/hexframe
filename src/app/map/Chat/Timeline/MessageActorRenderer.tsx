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
    <div className="w-full p-4 rounded-lg border border-border bg-card">
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