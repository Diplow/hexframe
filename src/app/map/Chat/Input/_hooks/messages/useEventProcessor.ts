import { useRef, useEffect } from 'react';
import type { ChatEvent, ExecuteCommandPayload } from '~/app/map/Chat/_state';

/**
 * Custom hook for processing command events from chat state
 */
export function useEventProcessor(events: ChatEvent[], executeCommand: (command: string) => Promise<string>) {
  const lastProcessedCommandRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!events || !Array.isArray(events)) return;
    
    const unprocessedEvents = events.filter((e): e is ChatEvent & { type: 'execute_command' } => 
      e.type === 'execute_command' && 
      e.timestamp.getTime() > (lastProcessedCommandRef.current ? new Date(lastProcessedCommandRef.current).getTime() : 0)
    );
    
    if (unprocessedEvents.length > 0) {
      const latestEvent = unprocessedEvents[unprocessedEvents.length - 1];
      if (!latestEvent) return;
      
      const payload = latestEvent.payload as ExecuteCommandPayload;
      const command = payload.command;
      lastProcessedCommandRef.current = latestEvent.timestamp.toISOString();
      executeCommand(command).catch((error) => {
        console.error('Failed to execute command:', error);
      });
    }
  }, [events, executeCommand]);
}