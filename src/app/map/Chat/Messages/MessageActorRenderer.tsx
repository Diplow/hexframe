import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useAuth } from '~/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '~/commons/trpc/react';
import type { Message } from '../Cache/_events/event.types';
import { useChatEventDispatcher } from './_hooks/useChatEventDispatcher';

interface MessageActorRendererProps {
  message: Message;
}

export function MessageActorRenderer({ message }: MessageActorRendererProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { dispatchNavigation, dispatchMessage, dispatchAuthRequired, dispatchUserMessage, dispatchCommandExecution } = useChatEventDispatcher();
  
  const { data: userMapData } = api.map.user.getUserMap.useQuery(undefined, {
    enabled: !!user,
  });

  const formatTimestamp = () => {
    const date = new Date(message.timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const short = `${hours}:${minutes}`;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const full = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    
    return { short, full };
  };

  const handleUserClick = () => {
    if (user && userMapData?.success && userMapData.map?.id) {
      _navigateToUserMap(userMapData.map);
    } else if (user && (!userMapData || !userMapData.success)) {
      dispatchMessage('Creating your map...');
    } else {
      dispatchAuthRequired('Create an account to have your own map');
    }
  };

  const _navigateToUserMap = (map: { id: number; name?: string }) => {
    const mapUrl = `/map?center=${map.id}`;
    console.log('Navigating to user map:', { mapId: map.id, mapUrl, userName: user?.name });
    router.push(mapUrl);
    
    dispatchNavigation(String(map.id), map.name ?? user?.name ?? 'Your Map');
    dispatchMessage(`Navigating to ${map.name ?? user?.name ?? 'your'} map...`);
  };

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
      return <span className="font-bold text-primary mr-2">Lucy:</span>;
    }
    
    if (message.actor === 'system') {
      return <span className="font-bold text-muted-foreground mr-2">System:</span>;
    }
    
    return null;
  };

  const createMarkdownComponents = () => ({
    p: ({ children, ..._props }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => <>{children}</>,
    br: () => <br />,
    ul: ({ children, ..._props }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => <ul className="list-disc list-inside mb-1">{children}</ul>,
    ol: ({ children, ..._props }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
    li: ({ children, ..._props }: { children?: React.ReactNode } & React.LiHTMLAttributes<HTMLLIElement>) => <li className="ml-2" {..._props}>{children}</li>,
    strong: ({ children, ..._props }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => (
      <strong className={`font-semibold ${message.actor === 'system' ? 'text-muted-foreground' : 'text-foreground'}`}>
        {children}
      </strong>
    ),
    a: ({ href, children, ..._props }: { href?: string; children?: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      if (href?.startsWith('command:')) {
        return _renderCommandLink(href, children);
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    code: ({ className, children, ..._props }: { className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => {
      const isInline = !className;
      const mutedStyle = message.actor === 'system' 
        ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400' 
        : 'bg-neutral-400 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100';
      
      return isInline ? (
        <code className={`${mutedStyle} px-1 py-0.5 rounded`} {..._props}>
          {children}
        </code>
      ) : (
        <pre className={`${mutedStyle} p-4 rounded-lg overflow-x-auto my-2`}>
          <code className={className} {..._props}>
            {children}
          </code>
        </pre>
      );
    },
  });

  const _renderCommandLink = (href: string, children: React.ReactNode) => {
    const command = href.slice(8); // Remove 'command:' prefix
    
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => {
          dispatchUserMessage(command);
          dispatchCommandExecution(command);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.currentTarget.click();
          }
        }}
        className={`underline transition-colors cursor-pointer ${
          message.actor === 'system' 
            ? 'text-muted-foreground hover:text-foreground' 
            : 'text-primary hover:text-primary/80'
        }`}
      >
        {children}
      </span>
    );
  };

  const timestamps = formatTimestamp();
  
  return (
    <div className="w-full">
      <div className="text-sm whitespace-pre-wrap">
        <span className="text-xs text-muted-foreground mr-2" title={timestamps.full}>
          {timestamps.short}
        </span>
        {renderActorLabel()}
        <span className={message.actor === 'system' ? 'text-muted-foreground' : ''}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={createMarkdownComponents()}
          >
            {message.content}
          </ReactMarkdown>
        </span>
      </div>
    </div>
  );
}