'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useChatCacheOperations } from '../Cache/hooks/useChatCacheOperations';
import { useCommandHandling } from './_hooks/useCommandHandling';
import { useInputHistory } from './_hooks/useInputHistory';
import { useTextareaController } from './_hooks/useTextareaController';
import { useChatInputService } from './_services/chatInputService';

export function Input() {
  const [message, setMessage] = useState('');
  const lastProcessedCommandRef = useRef<string | null>(null);
  const { events } = useChatCacheOperations();
  
  const { executeCommand, executeCommandFromPayload } = useCommandHandling();
  const { addToHistory, navigateHistory } = useInputHistory();
  const { sendMessage, isCommand, validateMessage } = useChatInputService();
  
  const { textareaRef, handleKeyDown, resetTextareaHeight } = useTextareaController({
    message,
    onNavigateHistory: (direction) => {
      const historyMessage = navigateHistory(direction);
      if (historyMessage !== null) {
        setMessage(historyMessage);
      }
      return historyMessage;
    },
    onSubmit: handleSend,
  });

  function handleSend() {
    if (!validateMessage(message)) return;
    
    const trimmed = message.trim();
    addToHistory(trimmed);
    
    if (isCommand(trimmed)) {
      executeCommand(trimmed);
    } else {
      sendMessage(trimmed);
    }
    
    setMessage('');
    resetTextareaHeight();
  }
  
  function handleKeyDownWithHistory(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const historyMessage = handleKeyDown(e);
    if (historyMessage !== null) {
      setMessage(historyMessage);
    }
  }
  
  useEffect(() => {
    const unprocessedEvents = events.filter(e => 
      e.type === 'execute_command' && 
      e.timestamp.getTime() > (lastProcessedCommandRef.current ? new Date(lastProcessedCommandRef.current).getTime() : 0)
    );
    
    if (unprocessedEvents.length > 0) {
      const latestEvent = unprocessedEvents[unprocessedEvents.length - 1];
      if (!latestEvent) return;
      
      const payload = latestEvent.payload as { command: string };
      lastProcessedCommandRef.current = latestEvent.timestamp.toISOString();
      void executeCommandFromPayload(payload);
    }
  }, [events, executeCommandFromPayload]);
  
  return (
    <div className="flex items-end gap-2 p-4 border-t border-[color:var(--stroke-color-950)]">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDownWithHistory}
        placeholder="Type a message..."
        className="flex-1 resize-none rounded-lg px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] max-h-[120px]"
        rows={1}
        data-testid="chat-input"
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim()}
        size="sm"
        className="h-10 w-10 p-0"
        data-testid="send-button"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}