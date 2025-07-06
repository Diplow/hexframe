import { useEffect, useRef } from 'react';
import type { Message } from '../_cache/_events/event.types';
import { DaySeparator } from './DaySeparator';
import { MessageActorRenderer } from './MessageActorRenderer';

interface MessageTimelineProps {
  messages: Message[];
}

export function MessageTimeline({ messages }: MessageTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    _scrollToBottom();
  }, [messages]);

  const _scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const groupMessagesByDay = () => {
    return messages.reduce((acc, message) => {
      const date = new Date(message.timestamp);
      const dateKey = date.toLocaleDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(message);
      return acc;
    }, {} as Record<string, Message[]>);
  };

  const messagesByDay = groupMessagesByDay();

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-3"
      data-testid="chat-messages"
    >
      {Object.entries(messagesByDay).map(([dateKey, dayMessages]) => (
        <div key={dateKey}>
          <DaySeparator date={new Date(dayMessages[0]?.timestamp ?? Date.now())} />
          {dayMessages.map((message) => (
            <MessageActorRenderer key={message.id} message={message} />
          ))}
        </div>
      ))}
    </div>
  );
}