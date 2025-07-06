import { useState, useEffect } from 'react';
import { chatSettings, type ChatSettings } from './chat-settings';

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>(chatSettings.getSettings());

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = chatSettings.subscribe(setSettings);
    return unsubscribe;
  }, []);

  return settings;
}