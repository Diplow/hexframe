'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useChatCacheOperations } from './_cache/hooks/useChatCacheOperations';
import { chatSettings } from './_settings/chat-settings';

const HISTORY_KEY = 'hexframe-chat-history';
const MAX_HISTORY = 50;

interface Command {
  description: string;
  action?: () => string;
}

// Command definitions - using a flat structure
const commands: Record<string, Command> = {
  '/settings': {
    description: 'Chat settings',
  },
  '/settings/messages': {
    description: 'Message display settings',
  },
  '/settings/messages/toggle': {
    description: 'Toggle message types',
  },
  '/settings/messages/toggle/tile': {
    description: 'Tile operation messages',
  },
  '/settings/messages/toggle/tile/edit': {
    description: 'Toggle tile edit messages',
    action: () => {
      const newState = chatSettings.toggleTileEdit();
      return `Tile edit messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/tile/create': {
    description: 'Toggle tile create messages',
    action: () => {
      const newState = chatSettings.toggleTileCreate();
      return `Tile create messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/tile/delete': {
    description: 'Toggle tile delete messages',
    action: () => {
      const newState = chatSettings.toggleTileDelete();
      return `Tile delete messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/tile/move': {
    description: 'Toggle tile move messages',
    action: () => {
      const newState = chatSettings.toggleTileMove();
      return `Tile move messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/tile/swap': {
    description: 'Toggle tile swap messages',
    action: () => {
      const newState = chatSettings.toggleTileSwap();
      return `Tile swap messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/toggle/debug': {
    description: 'Toggle debug messages (shows all bus events)',
    action: () => {
      const newState = chatSettings.toggleDebug();
      return `Debug messages are now ${newState ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/status': {
    description: 'Show current message visibility settings',
    action: () => {
      const settings = chatSettings.getSettings();
      const tile = settings.messages.tile;
      return `**Current message settings:**
• Tile edit: ${tile.edit ? 'enabled' : 'disabled'}
• Tile create: ${tile.create ? 'enabled' : 'disabled'}
• Tile delete: ${tile.delete ? 'enabled' : 'disabled'}
• Tile move: ${tile.move ? 'enabled' : 'disabled'}
• Tile swap: ${tile.swap ? 'enabled' : 'disabled'}
• Debug mode: ${settings.messages.debug ? 'enabled' : 'disabled'}`;
    }
  },
  '/settings/messages/reset': {
    description: 'Reset all message settings to defaults',
    action: () => {
      chatSettings.resetToDefaults();
      return 'All message settings have been reset to defaults.';
    }
  }
};

export function ChatInput() {
  const [message, setMessage] = useState('');
  const [messageHistory, setMessageHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) as string[] : [];
    } catch {
      return [];
    }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastProcessedCommandRef = useRef<string | null>(null); // Stores ISO timestamp
  const { dispatch, events } = useChatCacheOperations();

  const findCommand = useCallback((path: string): Command | null => {
    // Simply return the command from the flat structure
    return commands[path] ?? null;
  }, []);

  const handleCommand = useCallback((cmd: string): boolean => {
    // Trim trailing slashes
    const normalizedCmd = cmd.replace(/\/+$/, '');
    const command = findCommand(normalizedCmd);
    
    if (!command) {
      // Command not found, don't show suggestions for exact paths
      return false;
    }
    
    // If it has an action, execute it
    if (command.action) {
      const result = command.action();
      dispatch({
        type: 'message',
        payload: {
          content: result,
          actor: 'system',
        },
        id: `cmd-result-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system',
      });
      return true;
    }
    
    // Otherwise show subcommands
    const subcommands = Object.keys(commands)
      .filter(key => key.startsWith(normalizedCmd + '/') && key !== normalizedCmd)
      .map(key => ({
        command: key,
        description: commands[key]?.description ?? ''
      }))
      // Filter to only show direct children (not grandchildren)
      .filter(({ command }) => {
        const remainder = command.slice(normalizedCmd.length + 1);
        return remainder && !remainder.includes('/');
      });
    
    if (subcommands.length > 0) {
      // Show the current command's description if it has one
      const currentDesc = command.description ? `${normalizedCmd} - ${command.description}\n\n` : '';
      
      const helpText = `${currentDesc}Available commands:\n\n${subcommands.map(({ command, description }) => 
        `[${command}](command:${command}) - ${description}`
      ).join('  \n')}`;
      
      dispatch({
        type: 'message',
        payload: {
          content: helpText,
          actor: 'system',
        },
        id: `cmd-help-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system',
      });
      return true;
    }
    
    return false;
  }, [dispatch, findCommand]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    
    // Add to history
    setMessageHistory(prev => {
      const newHistory = [...prev, trimmed];
      // Keep only the last MAX_HISTORY messages
      const trimmedHistory = newHistory.slice(-MAX_HISTORY);
      // Save to localStorage
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
      } catch (e) {
        console.error('Failed to save message history:', e);
      }
      return trimmedHistory;
    });
    setHistoryIndex(-1); // Reset history navigation
    
    // Check if it's a command
    if (trimmed.startsWith('/')) {
      // Handle the command without showing it in chat
      handleCommand(trimmed);
      
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      return;
    }
    
    // Regular message
    dispatch({
      type: 'user_message',
      payload: {
        text: trimmed,
      },
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      actor: 'user',
    });
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp' && message === '') {
      e.preventDefault();
      if (messageHistory.length > 0) {
        const newIndex = historyIndex === -1 
          ? messageHistory.length - 1 
          : Math.max(0, historyIndex - 1);
        
        setHistoryIndex(newIndex);
        setMessage(messageHistory[newIndex] ?? '');
      }
    } else if (e.key === 'ArrowDown' && message === '') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        
        if (newIndex >= messageHistory.length) {
          setHistoryIndex(-1);
          setMessage('');
        } else {
          setHistoryIndex(newIndex);
          setMessage(messageHistory[newIndex] ?? '');
        }
      }
    }
  };
  
  // Listen for command execution events
  useEffect(() => {
    // Find execute_command events that we haven't processed yet
    const unprocessedEvents = events.filter(e => 
      e.type === 'execute_command' && 
      e.timestamp.getTime() > (lastProcessedCommandRef.current ? new Date(lastProcessedCommandRef.current).getTime() : 0)
    );
    
    if (unprocessedEvents.length > 0) {
      // Process the most recent unprocessed event
      const latestEvent = unprocessedEvents[unprocessedEvents.length - 1];
      if (!latestEvent) return;
      
      const payload = latestEvent.payload as { command: string };
      
      // Mark as processed
      lastProcessedCommandRef.current = latestEvent.timestamp.toISOString();
      
      // Execute the command directly here instead of using handleCommand
      const command = commands[payload.command];
      if (command) {
        if (command.action) {
          // Execute action
          const result = command.action();
          dispatch({
            type: 'message',
            payload: {
              content: result,
              actor: 'system',
            },
            id: `cmd-result-${Date.now()}`,
            timestamp: new Date(),
            actor: 'system',
          });
        } else {
          // Show subcommands using handleCommand
          handleCommand(payload.command);
        }
      } else {
        // Command not found
        dispatch({
          type: 'message',
          payload: {
            content: `Command not found: ${payload.command}`,
            actor: 'system',
          },
          id: `cmd-error-${Date.now()}`,
          timestamp: new Date(),
          actor: 'system',
        });
      }
    }
  }, [events, dispatch, handleCommand]);

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