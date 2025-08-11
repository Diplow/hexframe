'use client';

import type { Widget } from '../_state/types';
import type { Message } from '../_state/_events/event.types';
import { useChatSettings } from '../_settings/useChatSettings';
import { useAuthStateCoordinator } from './_hooks/useAuthStateCoordinator';
import { UnifiedTimeline } from './UnifiedTimeline';
import { useEffect } from 'react';
import { loggers } from '~/lib/debug/debug-logger';

interface MessagesProps {
  messages: Message[];
  widgets: Widget[];
}

export function Messages({ messages, widgets }: MessagesProps) {
  console.log('[Messages] Component rendered with:', {
    messageCount: messages.length,
    widgetCount: widgets.length,
    widgets: widgets.map(w => ({ id: w.id, type: w.type }))
  })
  
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