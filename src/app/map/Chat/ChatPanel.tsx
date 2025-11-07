'use client';

import { useState, useEffect } from 'react';
import { cn } from '~/lib/utils';
import { useChatState, ChatProvider } from '~/app/map/Chat';
import { Timeline } from '~/app/map/Chat/Timeline';
import { Input } from '~/app/map/Chat/Input';
import { ThemeToggle } from '~/components/ThemeToggle';
import { Logo } from '~/components/ui/logo';
import { Button } from '~/components/ui/button';
import { LogOut, LogIn } from 'lucide-react';
import { authClient } from '~/lib/auth';
import { loggers } from '~/lib/debug/debug-logger';
import { useEventBus } from '~/app/map/Services';
import { useAIChatIntegration } from '~/app/map/Chat/_hooks/useAIChatIntegration';

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  return (
    <ChatProvider>
      <div data-testid="chat-panel" className={cn('flex flex-col h-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-r border-[color:var(--stroke-color-950)]', className)}>
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
  const eventBus = useEventBus();

  // Enable AI chat integration
  const { isGeneratingAI } = useAIChatIntegration();

  // Check auth status on mount and emit auth_required if not authenticated
  useEffect(() => {
    void authClient.getSession().then(session => {
      if (!session?.data?.user) {
        // User is not authenticated, show login widget
        eventBus.emit({
          type: 'auth.required' as const,
          payload: {
            reason: 'Please sign in to use HexFrame'
          },
          source: 'auth' as const,
          timestamp: new Date()
        });
      }
    });
  }, [eventBus]);

  return (
    <>
      <Timeline messages={messages} widgets={widgets} />
      {isGeneratingAI && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-neutral-100/50 dark:bg-neutral-800/50 backdrop-blur-sm rounded-lg mx-4 my-2">
          <div className="flex gap-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
          </div>
          <span>HexFrame is thinking</span>
        </div>
      )}
      <Input />
    </>
  );
}

function ChatHeader() {
  const eventBus = useEventBus();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ id: string; name?: string | null } | null>(null);

  // Prevent hydration mismatch by checking if component is mounted
  useEffect(() => {
    setMounted(true);

    // Get initial auth state
    void authClient.getSession().then(session => {
      setUser(session?.data?.user ?? null);
    });
  }, []);

  // Subscribe to auth events via EventBus
  useEffect(() => {
    const unsubscribe = eventBus.on('auth.*', (event) => {
      if (event.type === 'auth.login') {
        // Update user from login event
        const payload = event.payload as { userId?: string; userName?: string };
        setUser({
          id: payload.userId ?? '',
          name: payload.userName
        });
      }
      if (event.type === 'auth.logout') {
        setUser(null);
      }
    });

    return unsubscribe;
  }, [eventBus]);

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
        source: 'auth' as const,
        timestamp: new Date(),
      });
      // Local state will update via event listener above
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
    <div className="flex items-center justify-between p-2 border-b border-[color:var(--stroke-color-950)] bg-neutral-200/75 dark:bg-neutral-800/75 backdrop-blur-sm">
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
          aria-label={mounted && user ? 'Logout' : 'Login'}
        >
          {mounted && user ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}