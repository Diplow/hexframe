'use client';

import { useEffect, useRef } from 'react';
import { useChat } from './ChatProvider';

interface UseCenterChangeNotificationProps {
  centerCoordinate: string;
  centerTitle?: string;
}

export function useCenterChangeNotification({ 
  centerCoordinate, 
  centerTitle 
}: UseCenterChangeNotificationProps) {
  const { dispatch } = useChat();
  const previousCenterRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Skip the initial mount
    if (previousCenterRef.current === null) {
      previousCenterRef.current = centerCoordinate;
      return;
    }
    
    // Check if center actually changed
    if (previousCenterRef.current !== centerCoordinate) {
      dispatch({
        type: 'CENTER_CHANGED',
        payload: {
          newCenter: centerCoordinate,
          title: centerTitle,
        },
      });
      
      previousCenterRef.current = centerCoordinate;
    }
  }, [centerCoordinate, centerTitle, dispatch]);
}