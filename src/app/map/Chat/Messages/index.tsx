'use client';

import type { Widget } from '../Cache/types';
import type { Message } from '../Cache/_events/event.types';
import { useChatSettings } from '../_settings/useChatSettings';
import { useAuthStateCoordinator } from './_hooks/useAuthStateCoordinator';
import { UnifiedTimeline } from './UnifiedTimeline';

interface MessagesProps {
  messages: Message[];
  widgets: Widget[];
}

export function Messages({ messages, widgets }: MessagesProps) {
  useChatSettings(); // Trigger re-render when settings change
  useAuthStateCoordinator(widgets);

  // Combine messages and widgets into a unified timeline sorted by timestamp
  const timelineItems = [
    ...messages.map(msg => ({ type: 'message' as const, data: msg, timestamp: msg.timestamp })),
    ...widgets.map(widget => ({ type: 'widget' as const, data: widget, timestamp: widget.timestamp }))
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <UnifiedTimeline items={timelineItems} />
  );
}