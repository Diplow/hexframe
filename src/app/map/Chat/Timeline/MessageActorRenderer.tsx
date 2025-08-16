import { useUnifiedAuth } from '~/contexts/UnifiedAuthContext';
import type { Message } from '../_state/_events/event.types';
import { useEffect } from 'react';
import { loggers } from '~/lib/debug/debug-logger';
import { TimestampRenderer } from './TimestampRenderer';
import { useUserClickHandler } from './UserClickHandler';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyButton } from './CopyButton';
import { MessageActions } from './MessageActions';

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
          className="font-bold text-secondary mr-2 hover:underline focus:outline-none"
        >
          {user ? 'You:' : 'Guest (you):'}
        </button>
      );
    }
    
    if (message.actor === 'assistant') {
      return <span className="font-bold text-primary-light mr-2">HexFrame:</span>;
    }
    
    if (message.actor === 'system') {
      return <span className="font-bold text-muted-foreground mr-2">System:</span>;
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
    <div className="w-full group">
      <div className="text-sm">
        <TimestampRenderer timestamp={message.timestamp} />
        {renderActorLabel()}
        {message.isEditing ? (
          <MessageActions message={message} />
        ) : (
          <>
            <MarkdownRenderer 
              content={message.content} 
              isSystemMessage={message.actor === 'system'} 
            />
            <MessageActions message={message} />
          </>
        )}
        {renderCopyButtons()}
      </div>
    </div>
  );
}