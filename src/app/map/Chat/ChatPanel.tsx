'use client';

import { cn } from '~/lib/utils';
import { useChatCache } from './Cache/ChatCacheProvider';
import { useChatCacheOperations } from './Cache/hooks/useChatCacheOperations';
import { Messages } from './Messages';
import { Input } from './Input';
import { ThemeToggle } from '~/components/ThemeToggle';
import { Logo } from '~/components/ui/logo';
import { Button } from '~/components/ui/button';
import { LogOut, LogIn } from 'lucide-react';
import { useAuth } from '~/contexts/AuthContext';
import { authClient } from '~/lib/auth/auth-client';
import { useEffect } from 'react';
import { loggers } from '~/lib/debug/debug-logger';

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  const { state } = useChatCache();
  const { visibleMessages, activeWidgets } = state;
  
  // Debug logging for ChatPanel renders
  useEffect(() => {
    loggers.render.chat('ChatPanel mounted');
    return () => {
      loggers.render.chat('ChatPanel unmounted');
    };
  }, []);
  
  useEffect(() => {
    loggers.render.chat('ChatPanel updated', {
      visibleMessageCount: visibleMessages.length,
      activeWidgetCount: activeWidgets.length
    });
  }, [visibleMessages, activeWidgets]);

  return (
    <div data-testid="chat-panel" className={cn('flex flex-col h-full bg-center-depth-0', className)}>
      <ChatHeader />
      <Messages messages={visibleMessages} widgets={activeWidgets} />
      <Input />
    </div>
  );
}

function ChatHeader() {
  const { user } = useAuth();
  const { dispatch, eventBus } = useChatCacheOperations();
  
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
      // Show login widget in chat instead of redirecting
      dispatch({
        type: 'auth_required',
        payload: {
          reason: 'Please log in to access this feature',
        },
        id: `auth-${Date.now()}`,
        timestamp: new Date(),
        actor: 'system',
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