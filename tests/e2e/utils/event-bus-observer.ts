import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Event bus observer for E2E tests
 * 
 * This utility allows E2E tests to observe and assert on event bus events
 * and logs that occur during test execution.
 */

interface ObservedEvent {
  type: string;
  source: string;
  payload: any;
  timestamp: string;
}

interface ObservedLog {
  timestamp: number;
  prefix: string;
  message: string;
  data?: Record<string, unknown>;
}

export class EventBusObserver {
  private events: ObservedEvent[] = [];
  private logs: ObservedLog[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Start observing events and logs
   * Must be called before the actions that trigger events
   */
  async startObserving() {
    // Inject event bus listener into the page
    await this.page.evaluate(() => {
      // Store events in window for later retrieval
      (window as any).__e2e_events = [];
      (window as any).__e2e_logs = [];

      // Listen to all events
      if ((window as any).eventBus) {
        (window as any).eventBus.on('*', (event: any) => {
          (window as any).__e2e_events.push({
            type: event.type,
            source: event.source,
            payload: event.payload,
            timestamp: new Date().toISOString(),
          });
        });
      }

      // Intercept debug logger
      if ((window as any).debugLogger) {
        const originalLog = (window as any).debugLogger.log;
        (window as any).debugLogger.log = function(config: any) {
          (window as any).__e2e_logs.push({
            timestamp: Date.now(),
            prefix: config.prefix.join('.'),
            message: config.message,
            data: config.data,
          });
          return originalLog.call(this, config);
        };
      }
    });
  }

  /**
   * Stop observing and retrieve all events and logs
   */
  async stopObserving() {
    const result = await this.page.evaluate(() => {
      return {
        events: (window as any).__e2e_events || [],
        logs: (window as any).__e2e_logs || [],
      };
    });

    this.events = result.events;
    this.logs = result.logs;

    // Clean up
    await this.page.evaluate(() => {
      delete (window as any).__e2e_events;
      delete (window as any).__e2e_logs;
    });
  }

  /**
   * Get all observed events
   */
  getEvents(): ObservedEvent[] {
    return this.events;
  }

  /**
   * Get all observed logs
   */
  getLogs(): ObservedLog[] {
    return this.logs;
  }

  /**
   * Assert that an event was emitted
   */
  expectEvent(eventType: string, payload?: any) {
    const event = this.events.find(e => e.type === eventType);
    expect(event, `Expected event "${eventType}" to be emitted`).toBeTruthy();
    
    if (payload !== undefined && event) {
      expect(event.payload).toEqual(payload);
    }
  }

  /**
   * Assert that an event was NOT emitted
   */
  expectNoEvent(eventType: string) {
    const event = this.events.find(e => e.type === eventType);
    expect(event, `Expected event "${eventType}" NOT to be emitted`).toBeFalsy();
  }

  /**
   * Assert that a log message was recorded
   */
  expectLog(prefix: string, messagePattern: string | RegExp) {
    const log = this.logs.find(l => {
      if (!l.prefix.includes(prefix)) return false;
      
      if (typeof messagePattern === 'string') {
        return l.message.includes(messagePattern);
      } else {
        return messagePattern.test(l.message);
      }
    });
    
    expect(log, `Expected log with prefix "${prefix}" and message matching "${messagePattern}"`).toBeTruthy();
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(eventType: string): ObservedEvent[] {
    return this.events.filter(e => e.type === eventType);
  }

  /**
   * Get logs with a specific prefix
   */
  getLogsByPrefix(prefix: string): ObservedLog[] {
    return this.logs.filter(l => l.prefix.includes(prefix));
  }

  /**
   * Clear all observed events and logs
   */
  clear() {
    this.events = [];
    this.logs = [];
  }
}

/**
 * Extended test with event bus observer
 */
export const test = base.extend<{
  eventBusObserver: EventBusObserver;
}>({
  eventBusObserver: async ({ page }, use) => {
    const observer = new EventBusObserver(page);
    await use(observer);
  },
});

export { expect };