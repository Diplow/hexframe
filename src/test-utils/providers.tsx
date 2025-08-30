import React from 'react';
import { expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '~/contexts/AuthContext';
import { ThemeProvider } from '~/contexts/ThemeContext';
import { EventBusProvider, EventBusContext } from '~/app/map';
import { EventBus } from '~/app/map';
import { createMockEventBus, type MockEventBus } from '~/test-utils/event-bus';
import { debugLogger } from '~/lib/debug/debug-logger';

interface TestProvidersProps {
  children: React.ReactNode;
  mockEventBus?: MockEventBus;
  useRealEventBus?: boolean;
  queryClient?: QueryClient;
}

/**
 * Integrated test providers that include event bus and logging setup
 * 
 * @param mockEventBus - Optional mock event bus (defaults to creating a new one)
 * @param useRealEventBus - If true, uses real EventBus instead of mock
 * @param queryClient - Optional query client (defaults to creating a new one)
 */
export function TestProviders({
  children,
  mockEventBus,
  useRealEventBus = false,
  queryClient,
}: TestProvidersProps) {
  // Set up debug logger for tests
  React.useEffect(() => {
    debugLogger.setOptions({
      enableConsole: false,
      enableUI: false,
    });
    return () => {
      debugLogger.clearBuffer();
    };
  }, []);

  // Create event bus (mock or real)
  const eventBus = useRealEventBus 
    ? new EventBus() 
    : (mockEventBus ?? createMockEventBus());

  // Create query client if not provided
  const testQueryClient = queryClient ?? new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Replaced cacheTime with gcTime in React Query v5
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        <ThemeProvider>
          <EventBusProvider eventBus={eventBus}>
            {children}
          </EventBusProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Render hook that returns the mock event bus for assertions
 */
export function useTestEventBus(): MockEventBus {
  const contextValue = React.useContext(EventBusContext);
  if (!contextValue || !('emittedEvents' in contextValue)) {
    throw new Error('useTestEventBus must be used within TestProviders with a mock event bus');
  }
  return contextValue as unknown as MockEventBus;
}

/**
 * Test setup helper that returns utilities for testing
 */
export function createTestSetup(options: Omit<TestProvidersProps, 'children'> = {}) {
  const mockEventBus = options.mockEventBus ?? createMockEventBus();
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders {...options} mockEventBus={mockEventBus}>
      {children}
    </TestProviders>
  );

  return {
    wrapper,
    eventBus: mockEventBus,
    expectEvent: (eventType: string, payload?: unknown) => {
      expect(mockEventBus).toHaveEmittedEvent(eventType, payload);
    },
    clearEvents: () => {
      mockEventBus.emittedEvents.length = 0;
      mockEventBus.emit.mockClear();
    },
  };
}

// Re-export event bus utilities for convenience
export { createMockEventBus, expectEventEmitted, expectEventNotEmitted, clearEmittedEvents } from '~/test-utils/event-bus';