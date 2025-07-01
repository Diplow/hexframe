'use client';

import { useEffect, useRef } from 'react';
import { useMapCache } from '../Cache/_hooks/use-map-cache';
import { useChat } from './ChatProvider';
import { ChatPanel } from './ChatPanel';

interface ChatWithCenterTrackingProps {
  className?: string;
}

export function ChatWithCenterTracking({ className }: ChatWithCenterTrackingProps) {
  const { center, items } = useMapCache();
  const { dispatch } = useChat();
  const previousCenterRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Skip the initial mount
    if (previousCenterRef.current === null) {
      previousCenterRef.current = center;
      return;
    }
    
    // Check if center actually changed
    if (previousCenterRef.current !== center && center) {
      const centerTile = items[center];
      const title = centerTile?.data?.name || 'Untitled';
      
      dispatch({
        type: 'CENTER_CHANGED',
        payload: {
          newCenter: center,
          title,
        },
      });
      
      previousCenterRef.current = center;
    }
  }, [center, items, dispatch]);
  
  return <ChatPanel className={className} />;
}