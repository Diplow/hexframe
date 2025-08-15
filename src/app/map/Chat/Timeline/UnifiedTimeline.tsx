import { useEffect, useRef } from 'react';
import type { Message, Widget } from '../_state/_events/event.types';
import { DaySeparator } from './DaySeparator';
import { MessageActorRenderer } from './MessageActorRenderer';
import { WidgetManager } from './WidgetManager';
import { loggers } from '~/lib/debug/debug-logger';

interface TimelineItem {
  type: 'message' | 'widget';
  data: Message | Widget;
  timestamp: Date;
}

interface UnifiedTimelineProps {
  items: TimelineItem[];
}

export function UnifiedTimeline({ items }: UnifiedTimelineProps) {
  console.log('[UnifiedTimeline] Rendering with', items.length, 'items')
  items.forEach(item => {
    if (item.type === 'widget') {
      const widget = item.data as Widget
      console.log('[UnifiedTimeline] Widget item:', { 
        id: widget.id, 
        type: widget.type,
        timestamp: item.timestamp
      })
    }
  })
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Debug logging for UnifiedTimeline renders
  useEffect(() => {
    loggers.render.chat('UnifiedTimeline mounted', {
      itemCount: items.length
    });
    return () => {
      loggers.render.chat('UnifiedTimeline unmounted');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Only log mount/unmount
  
  useEffect(() => {
    loggers.render.chat('UnifiedTimeline updated', {
      itemCount: items.length,
      messageCount: items.filter(item => item.type === 'message').length,
      widgetCount: items.filter(item => item.type === 'widget').length
    });
  }, [items]);

  useEffect(() => {
    _scrollToBottom();
  }, [items]);

  const _scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const groupItemsByDay = () => {
    return items.reduce((acc, item) => {
      const date = new Date(item.timestamp);
      const dateKey = date.toLocaleDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {} as Record<string, TimelineItem[]>);
  };

  const itemsByDay = groupItemsByDay();

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-3"
      data-testid="chat-messages"
    >
      {Object.entries(itemsByDay).map(([dateKey, dayItems]) => (
        <div key={dateKey}>
          <DaySeparator date={new Date(dayItems[0]?.timestamp ?? Date.now())} />
          {dayItems.map((item) => (
            <div key={`${item.type}-${item.data.id}`} className="w-full">
              {item.type === 'message' ? (
                <MessageActorRenderer message={item.data as Message} />
              ) : (
                <div className="my-2">
                  <WidgetManager widgets={[item.data as Widget]} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}