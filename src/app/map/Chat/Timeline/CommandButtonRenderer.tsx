import { useEventBus } from '../../Services/EventBus/event-bus-context';

interface CommandButtonRendererProps {
  href: string;
  children: React.ReactNode;
  isSystemMessage: boolean;
}

export function CommandButtonRenderer({ href, children, isSystemMessage }: CommandButtonRendererProps) {
  const eventBus = useEventBus();
  const command = href.slice(18); // Remove '#hexframe-command:' prefix
  
  // Extract tooltip for navigation commands
  let tooltip = '';
  if (command.startsWith('navigate:')) {
    const parts = command.split(':');
    if (parts.length >= 3 && parts[2]) {
      tooltip = decodeURIComponent(parts[2]); // Full tile name for tooltip
    }
  }
  
  return (
    <button
      type="button"
      title={tooltip || undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        eventBus.emit({
          type: 'chat.command',
          payload: {
            command
          },
          source: 'chat_cache',
          timestamp: new Date(),
        });
      }}
      className={`underline transition-colors cursor-pointer bg-transparent border-none p-0 font-inherit ${
        isSystemMessage 
          ? 'text-muted-foreground hover:text-foreground' 
          : 'text-primary hover:text-primary/80'
      }`}
    >
      {children}
    </button>
  );
}