/**
 * Chat settings management
 * Handles user preferences for chat display
 */

export interface ChatSettings {
  messages: {
    tile: {
      edit: boolean;
      create: boolean;
      delete: boolean;
      move: boolean;
      swap: boolean;
      copy: boolean;
    };
    debug: boolean;
  };
}

const SETTINGS_KEY = 'hexframe-chat-settings';

const defaultSettings: ChatSettings = {
  messages: {
    tile: {
      edit: true,
      create: true,
      delete: true,
      move: true,
      swap: true,
      copy: true,
    },
    debug: false,
  },
};

export class ChatSettingsManager {
  private settings: ChatSettings;
  private listeners = new Set<(settings: ChatSettings) => void>();

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): ChatSettings {
    if (typeof window === 'undefined') return defaultSettings;
    
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatSettings;
        // Deep merge to ensure all nested properties exist
        return {
          messages: {
            tile: {
              ...defaultSettings.messages.tile,
              ...(parsed.messages?.tile ?? {})
            },
            debug: parsed.messages?.debug ?? defaultSettings.messages.debug,
          },
        };
      }
    } catch (e) {
      console.error('Failed to load chat settings:', e);
    }
    
    return defaultSettings;
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save chat settings:', e);
    }
  }

  getSettings(): ChatSettings {
    return this.settings;
  }

  toggleTileEdit(): boolean {
    this.settings.messages.tile.edit = !this.settings.messages.tile.edit;
    this.saveSettings();
    this.notifyListeners();
    return this.settings.messages.tile.edit;
  }

  toggleTileCreate(): boolean {
    this.settings.messages.tile.create = !this.settings.messages.tile.create;
    this.saveSettings();
    this.notifyListeners();
    return this.settings.messages.tile.create;
  }

  toggleTileDelete(): boolean {
    this.settings.messages.tile.delete = !this.settings.messages.tile.delete;
    this.saveSettings();
    this.notifyListeners();
    return this.settings.messages.tile.delete;
  }

  toggleTileMove(): boolean {
    this.settings.messages.tile.move = !this.settings.messages.tile.move;
    this.saveSettings();
    this.notifyListeners();
    return this.settings.messages.tile.move;
  }

  toggleTileSwap(): boolean {
    this.settings.messages.tile.swap = !this.settings.messages.tile.swap;
    this.saveSettings();
    this.notifyListeners();
    return this.settings.messages.tile.swap;
  }

  toggleTileCopy(): boolean {
    this.settings.messages.tile.copy = !this.settings.messages.tile.copy;
    this.saveSettings();
    this.notifyListeners();
    return this.settings.messages.tile.copy;
  }

  toggleDebug(): boolean {
    this.settings.messages.debug = !this.settings.messages.debug;
    this.saveSettings();
    this.notifyListeners();
    return this.settings.messages.debug;
  }

  resetToDefaults(): void {
    this.settings = { ...defaultSettings };
    this.saveSettings();
    this.notifyListeners();
  }

  subscribe(listener: (settings: ChatSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }
}

// Singleton instance
export const chatSettings = new ChatSettingsManager();