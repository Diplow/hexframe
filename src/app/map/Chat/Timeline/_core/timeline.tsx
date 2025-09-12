'use client';

import type { Widget, Message } from '~/app/map/Chat/_state';
import { useChatSettings } from '~/app/map/Chat/_settings/useChatSettings';
import { useAuthStateCoordinator } from '~/app/map/Chat/Timeline/_components/_hooks/useAuthStateCoordinator';
import { UnifiedTimeline } from '~/app/map/Chat/Timeline/_core/UnifiedTimeline';
import { useEffect } from 'react';
import { loggers } from '~/lib/debug/debug-logger';

interface MessagesProps {
  messages: Message[];
  widgets: Widget[];
}

export function Messages({ messages, widgets }: MessagesProps) {
  useChatSettings(); // Trigger re-render when settings change
  useAuthStateCoordinator(widgets);
  
  // Debug logging for Messages component renders
  useEffect(() => {
    loggers.render.chat('Messages component mounted');
    return () => {
      loggers.render.chat('Messages component unmounted');
    };
  }, []);
  
  useEffect(() => {
    loggers.render.chat('Messages component updated', {
      messageCount: messages.length,
      widgetCount: widgets.length,
      totalTimelineItems: messages.length + widgets.length
    });
  }, [messages, widgets]);

  // Combine messages and widgets into a unified timeline sorted by timestamp
  const timelineItems = [
    ...messages.map(msg => ({ type: 'message' as const, data: msg, timestamp: msg.timestamp })),
    ...widgets.map(widget => ({ type: 'widget' as const, data: widget, timestamp: widget.timestamp }))
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <UnifiedTimeline items={timelineItems} />
  );
}