'use client';

import { cn } from '~/lib/utils';
import { useChatCache } from './_cache/ChatCacheProvider';
import { useChatCacheOperations } from './_cache/hooks/useChatCacheOperations';
import { Messages } from './Messages';
import { ChatInput } from './ChatInput';
import { ThemeToggle } from '~/components/ThemeToggle';
import { Logo } from '~/components/ui/logo';
import { Button } from '~/components/ui/button';
import { LogOut, LogIn } from 'lucide-react';
import { useAuth } from '~/contexts/AuthContext';
import { authClient } from '~/lib/auth/auth-client';

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className }: ChatPanelProps) {
  const { state } = useChatCache();
  const { visibleMessages, activeWidgets } = state;

  return (
    <div data-testid="chat-panel" className={cn('flex flex-col h-full bg-center-depth-0', className)}>
      <ChatHeader />
      <Messages messages={visibleMessages} widgets={activeWidgets} />
      <ChatInput />
    </div>
  );
}

function ChatHeader() {
  const { user } = useAuth();
  const { dispatch, eventBus } = useChatCacheOperations();
  
  const handleAuthClick = async () => {
    if (user) {
      await authClient.signOut();
      // Emit logout event to clear the chat
      eventBus.emit({
        type: 'auth.logout',
        payload: {},
        source: 'chat_cache' as const,
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