'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useChat } from './ChatProvider';
import type { ChatMessage } from './types';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { dispatch } = useChat();
  
  const handleSend = () => {
    if (message.trim()) {
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: 'user',
        content: message.trim(),
        metadata: {
          timestamp: new Date(),
        },
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);
  
  return (
    <div className="flex items-end gap-2 p-4 border-t border-[color:var(--stroke-color-950)]">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
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