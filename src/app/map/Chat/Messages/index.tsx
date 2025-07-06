'use client';

import type { Widget } from '../Cache/types';
import type { Message } from '../Cache/_events/event.types';
import { useChatSettings } from '../_settings/useChatSettings';
import { useAuthStateCoordinator } from './_hooks/useAuthStateCoordinator';
import { MessageTimeline } from './MessageTimeline';
import { WidgetManager } from './WidgetManager';

interface MessagesProps {
  messages: Message[];
  widgets: Widget[];
}

export function Messages({ messages, widgets }: MessagesProps) {
  useChatSettings(); // Trigger re-render when settings change
  useAuthStateCoordinator(widgets);

  return (
    <>
      <MessageTimeline messages={messages} />
      <WidgetManager widgets={widgets} />
    </>
  );
}