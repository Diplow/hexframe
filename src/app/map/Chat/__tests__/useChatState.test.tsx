import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatStateInternal as useChatState } from '../_state/useChatState';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import type { ReactNode } from 'react';

// Mock the chat settings
vi.mock('../_settings/chat-settings', () => ({
  chatSettings: {
    getSettings: vi.fn(() => ({
      messages: { 
        debug: false,
        tile: {
          edit: true,
          create: true,
          delete: true,
          move: true,
          swap: true,
        }
      },
    })),
  },
}));

describe('useChatState', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders mockEventBus={mockEventBus}>
      {children}
    </TestProviders>
  );

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    vi.clearAllMocks();
  });

  it('should have welcome message by default', () => {
    const { result } = renderHook(() => useChatState(), { wrapper });
    
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.content).toContain('Welcome to');
    expect(result.current.messages[0]?.actor).toBe('system');
  });

  it('should add user messages when sendMessage is called', () => {
    const { result } = renderHook(() => useChatState(), { wrapper });
    
    act(() => {
      result.current.sendMessage('Hello world');
    });
    
    // Should have welcome message + user message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.content).toBe('Hello world');
    expect(result.current.messages[1]?.actor).toBe('user');
  });

  it('should add multiple messages in order', () => {
    const { result } = renderHook(() => useChatState(), { wrapper });
    
    act(() => {
      result.current.sendMessage('First message');
      result.current.sendMessage('Second message');
      result.current.sendMessage('Third message');
    });
    
    expect(result.current.messages).toHaveLength(4); // 1 welcome + 3 user messages
    expect(result.current.messages[1]?.content).toBe('First message');
    expect(result.current.messages[2]?.content).toBe('Second message');
    expect(result.current.messages[3]?.content).toBe('Third message');
  });

  it('should add system messages', () => {
    const { result } = renderHook(() => useChatState(), { wrapper });
    
    act(() => {
      result.current.showSystemMessage('System notification', 'info');
    });
    
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.content).toBe('System notification');
    expect(result.current.messages[1]?.actor).toBe('system');
  });

  it('should clear chat properly', () => {
    const { result } = renderHook(() => useChatState(), { wrapper });
    
    act(() => {
      result.current.sendMessage('Test message');
      result.current.sendMessage('Another message');
    });
    
    expect(result.current.messages.length).toBeGreaterThan(1);
    
    act(() => {
      result.current.clearChat();
    });
    
    // Should keep welcome message and add logout message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]?.content).toContain('Welcome to');
    expect(result.current.messages[1]?.content).toBe('You have been logged out');
  });

  it('should track events properly', () => {
    const { result } = renderHook(() => useChatState(), { wrapper });
    
    const initialEventCount = result.current.events.length;
    
    act(() => {
      result.current.sendMessage('Test event tracking');
    });
    
    expect(result.current.events).toHaveLength(initialEventCount + 1);
    const lastEvent = result.current.events[result.current.events.length - 1];
    expect(lastEvent?.type).toBe('user_message');
    expect(lastEvent?.payload).toEqual({ text: 'Test event tracking' });
  });
});