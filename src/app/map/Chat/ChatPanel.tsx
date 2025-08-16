'use client';

import { cn } from '~/lib/utils';
import { useChatState, ChatProvider } from './_state';
import { Timeline } from './Timeline/interface';
import { Input } from './Input';
import { ThemeToggle } from '~/components/ThemeToggle';
import { Logo } from '~/components/ui/logo';
import { Button } from '~/components/ui/button';
import { LogOut, LogIn } from 'lucide-react';
import { useUnifiedAuth } from '~/contexts/UnifiedAuthContext';
import { authClient } from '~/lib/auth/interface';
import { useEffect } from 'react';
import { loggers } from '~/lib/debug/debug-logger';
import { useEventBus } from '../Services/EventBus/event-bus-context';
import { useAIChatIntegration } from './_hooks/useAIChatIntegration';

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  return (
    <ChatProvider>
      <div data-testid="chat-panel" className={cn('flex flex-col h-full bg-center-depth-0', className)}>
        <ChatHeader />
        <ChatContent />
      </div>
    </ChatProvider>
  );
}

// Separate component that uses the chat state
function ChatContent() {
  const chatState = useChatState();
  const messages = chatState.messages;
  const widgets = chatState.widgets;
  
  // Enable AI chat integration
  const { isGeneratingAI } = useAIChatIntegration();

  return (
    <>
      <Timeline messages={messages} widgets={widgets} />
      {isGeneratingAI && (
        <div className="px-4 py-2 text-sm text-muted-foreground animate-pulse">
          Thinking...
        </div>
      )}
      <Input />
    </>
  );
}

function ChatHeader() {
  const { user } = useUnifiedAuth();
  const eventBus = useEventBus();
  
  // Debug logging for ChatHeader renders
  useEffect(() => {
    loggers.render.chat('ChatHeader rendered', {
      hasUser: !!user,
      userName: user?.name
    });
  });
  
  const handleAuthClick = async () => {
    if (user) {
      await authClient.signOut();
      // Emit logout event to clear the chat
      // Note: This should probably be emitted by the auth system, not chat
      eventBus.emit({
        type: 'auth.logout',
        payload: {},
        source: 'auth' as const, // Changed to match schema expectations
        timestamp: new Date(),
      });
    } else {
      // Emit auth.required event to show login widget
      eventBus.emit({
        type: 'auth.required' as const,
        payload: {
          reason: 'Please log in to access this feature'
        },
        source: 'map_cache' as const,
        timestamp: new Date()
      });
    }
  };
  
  return (
    <div className="flex items-center justify-between p-2 border-b border-[color:var(--stroke-color-950)]">
      <div className="flex items-center gap-2">
        <Logo className="w-6 h-6" />
        <h2 className="text-lg font-semibold">
          <span className="font-light">Hex</span><span className="font-bold">Frame</span>
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle size="sm" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAuthClick}
          className="h-8 w-8 p-0"
          aria-label={user ? 'Logout' : 'Login'}
        >
          {user ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}