import { describe, it, expect, beforeEach, vi } from 'vitest';
import { debugLogger } from '~/lib/debug/debug-logger';

describe('DebugLogger', () => {
  beforeEach(() => {
    debugLogger.clearBuffer();
    debugLogger.setOptions({ enableConsole: false });
  });

  describe('log storage', () => {
    it('should store logs in buffer', () => {
      debugLogger.log({
        prefix: ['DEBUG', 'TEST'],
        message: 'Test message',
      });

      const logs = debugLogger.getFullLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.prefix).toBe('[DEBUG][TEST]');
      expect(logs[0]?.message).toBe('Test message');
    });

    it('should maintain buffer size limit', () => {
      debugLogger.setOptions({ maxBufferSize: 5 });

      for (let i = 0; i < 10; i++) {
        debugLogger.log({
          prefix: ['DEBUG'],
          message: `Message ${i}`,
        });
      }

      const logs = debugLogger.getFullLogs();
      expect(logs).toHaveLength(5);
      expect(logs[0]?.message).toBe('Message 5');
      expect(logs[4]?.message).toBe('Message 9');
    });
  });

  describe('succinct mode with grouping', () => {
    it('should group consecutive logs with same prefix', () => {
      // Log the same prefix 3 times with different messages
      for (let i = 0; i < 3; i++) {
        debugLogger.log({
          prefix: ['DEBUG', 'RENDER', 'CANVAS'],
          message: `Canvas rendered ${i}`,
          data: { iteration: i },
        });
      }

      // Add a different log
      debugLogger.log({
        prefix: ['DEBUG', 'API'],
        message: 'API call made',
      });

      // Add the same canvas prefix again
      debugLogger.log({
        prefix: ['DEBUG', 'RENDER', 'CANVAS'],
        message: 'Canvas rendered again',
      });

      const grouped = debugLogger.getSuccinctLogs();
      expect(grouped).toHaveLength(3);
      
      // First group should have count 3 (grouped by prefix only)
      expect(grouped[0]?.count).toBe(3);
      expect(grouped[0]?.prefix).toBe('[DEBUG][RENDER][CANVAS]');
      
      // Second group should have count 1
      expect(grouped[1]?.count).toBe(1);
      expect(grouped[1]?.prefix).toBe('[DEBUG][API]');
      
      // Third group should have count 1
      expect(grouped[2]?.count).toBe(1);
      expect(grouped[2]?.prefix).toBe('[DEBUG][RENDER][CANVAS]');
    });

    it('should group logs by prefix even with different messages and data', () => {
      debugLogger.log({
        prefix: ['DEBUG', 'TEST'],
        message: 'First message',
        data: { id: 1 },
      });

      debugLogger.log({
        prefix: ['DEBUG', 'TEST'],
        message: 'Second message',
        data: { id: 2 },
      });

      const grouped = debugLogger.getSuccinctLogs();
      expect(grouped).toHaveLength(1);
      expect(grouped[0]?.count).toBe(2);
      expect(grouped[0]?.prefix).toBe('[DEBUG][TEST]');
    });
  });

  describe('formatting', () => {
    it('should format full logs correctly', () => {
      debugLogger.log({
        prefix: ['DEBUG', 'TEST'],
        message: 'Test message',
        data: { foo: 'bar' },
      });

      const formatted = debugLogger.formatLogs('full');
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toContain('[DEBUG][TEST]');
      expect(formatted[0]).toContain('Test message');
      expect(formatted[0]).toContain('{"foo":"bar"}');
    });

    it('should format succinct logs with count prefix', () => {
      // Add 3 identical logs
      for (let i = 0; i < 3; i++) {
        debugLogger.log({
          prefix: ['DEBUG', 'TEST'],
          message: 'Repeated message',
        });
      }

      const formatted = debugLogger.formatLogs('succinct');
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toContain('(3)');
      expect(formatted[0]).toContain('[DEBUG][TEST]');
    });

    it('should include identifiers in succinct mode', () => {
      // Clear buffer to ensure clean state
      debugLogger.clearBuffer();
      debugLogger.setOptions({ maxBufferSize: 100 }); // Ensure we have enough space
      
      // Canvas render with coordId
      debugLogger.log({
        prefix: ['DEBUG', 'RENDER', 'CANVAS'],
        message: 'FrameSlot render',
        data: { coordId: 'tile-123-456', slotScale: 2 },
      });

      // API log with tRPC pattern
      debugLogger.log({
        prefix: ['DEBUG', 'API'],
        message: 'tRPC QUERY: user.getUserMap',
        data: { input: { userId: 'user-123' }, type: 'query' },
      });

      // EventBus with type
      debugLogger.log({
        prefix: ['DEBUG', 'EVENTBUS'],
        message: 'Event emitted',
        data: { type: 'map.tile_selected' },
      });

      // Map cache handler
      debugLogger.log({
        prefix: ['DEBUG', 'MAPCACHE', 'HANDLERS'],
        message: '[NavigationHandler.navigateToItem] Called with:',
        data: { itemDbId: 'db-123-456' },
      });

      // Chat Input component
      debugLogger.log({
        prefix: ['DEBUG', 'RENDER', 'CHAT'],
        message: 'Input component rendered',
        data: { messageLength: 10 },
      });

      // Hierarchy - UserProfileTile
      debugLogger.log({
        prefix: ['DEBUG', 'RENDER', 'HIERARCHY'],
        message: 'UserProfileTile render',
        data: { hasUser: true, userName: 'john_doe' },
      });

      const formatted = debugLogger.formatLogs('succinct');
      expect(formatted).toHaveLength(6);
      
      // Check canvas identifier
      expect(formatted[0]).toContain('[DEBUG][RENDER][CANVAS] coord:tile-123-4');
      
      // Check API identifier
      expect(formatted[1]).toContain('[DEBUG][API] user.getUserMap userId');
      
      // Check EventBus identifier
      expect(formatted[2]).toContain('[DEBUG][EVENTBUS] map.tile_selected');
      
      // Check map cache handler identifier (truncated due to 30-char limit)
      expect(formatted[3]).toContain('[DEBUG][MAPCACHE][HANDLERS] NavigationHandler.na db-123-4');
      
      // Check chat input identifier
      expect(formatted[4]).toContain('[DEBUG][RENDER][CHAT] Input component rendered');
      
      // Check hierarchy identifier
      expect(formatted[5]).toContain('[DEBUG][RENDER][HIERARCHY] UserProfileTile john_doe');
    });

    it('should handle different API patterns', () => {
      debugLogger.clearBuffer();
      debugLogger.setOptions({ maxBufferSize: 100 });

      // tRPC client pattern
      debugLogger.log({
        prefix: ['DEBUG', 'API'],
        message: 'tRPC MUTATION: map.createTile',
        data: { input: { name: 'New Tile', parentId: 'parent-123' } },
      });

      // tRPC server pattern
      debugLogger.log({
        prefix: ['DEBUG', 'API'],
        message: 'TRPC SERVER QUERY: user.getProfile',
        data: { rawInput: { userId: 'user-456' } },
      });

      // Auth client pattern
      debugLogger.log({
        prefix: ['DEBUG', 'API'],
        message: 'AUTH CLIENT POST: /api/auth/sign-in',
        data: { method: 'POST' },
      });

      // Response pattern
      debugLogger.log({
        prefix: ['DEBUG', 'API'],
        message: 'tRPC RESPONSE: user.getUserMap (125ms)',
        data: { status: 200, duration: 125 },
      });

      // Generic HTTP pattern
      debugLogger.log({
        prefix: ['DEBUG', 'API'],
        message: 'GET /api/health',
        data: { status: 200 },
      });

      // In succinct mode, all [DEBUG][API] logs are grouped together
      const formatted = debugLogger.formatLogs('succinct');
      expect(formatted).toHaveLength(1);

      // Should show grouped count and identifier from first log
      expect(formatted[0]).toContain('(5)');
      expect(formatted[0]).toContain('[DEBUG][API] map.createTile name,parentId');
      
      // Test individual identifiers in full mode
      const fullFormatted = debugLogger.formatLogs('full');
      expect(fullFormatted).toHaveLength(5);
      
      // Check that each log has proper identifier in full mode when displayed individually
      const individualTests = [
        { message: 'tRPC MUTATION: map.createTile', expectedId: 'map.createTile name,parentId' },
        { message: 'TRPC SERVER QUERY: user.getProfile', expectedId: 'user.getProfile userId' },
        { message: 'AUTH CLIENT POST: /api/auth/sign-in', expectedId: 'auth.sign-in' },
        { message: 'tRPC RESPONSE: user.getUserMap (125ms)', expectedId: 'user.getUserMap 200 125ms' },
        { message: 'GET /api/health', expectedId: '/api/health' }
      ];
      
      // Test each pattern individually to verify identifier generation
      debugLogger.clearBuffer();
      for (let i = 0; i < individualTests.length; i++) {
        debugLogger.clearBuffer(); // Clear for each individual test
        const test = individualTests[i];
        if (!test) continue;
        
        debugLogger.log({
          prefix: ['DEBUG', 'API'],
          message: test.message,
          data: i === 0 ? { input: { name: 'New Tile', parentId: 'parent-123' } } :
                i === 1 ? { rawInput: { userId: 'user-456' } } :
                i === 2 ? { method: 'POST' } :
                i === 3 ? { status: 200, duration: 125 } :
                { status: 200 }
        });
        
        const singleFormatted = debugLogger.formatLogs('succinct');
        expect(singleFormatted[0]).toContain(test.expectedId);
      }
    });

    it('should handle missing identifiers gracefully', () => {
      // Clear buffer to ensure clean state
      debugLogger.clearBuffer();
      debugLogger.setOptions({ maxBufferSize: 100 });
      
      // Log without relevant data
      debugLogger.log({
        prefix: ['DEBUG', 'RENDER', 'CANVAS'],
        message: 'Some render',
        data: { unrelatedField: 'value' },
      });

      // Log with no data at all
      debugLogger.log({
        prefix: ['DEBUG', 'API'],
        message: 'Some API call',
      });

      const formatted = debugLogger.formatLogs('succinct');
      expect(formatted).toHaveLength(2);
      
      // Should not have identifier if no relevant data
      expect(formatted[0]).toMatch(/\[DEBUG\]\[RENDER\]\[CANVAS\]\s*(\[|$)/);
      expect(formatted[1]).toMatch(/\[DEBUG\]\[API\]\s*(\[|$)/);
    });

    it('should use fallback identifier from message before "|"', () => {
      // Clear buffer to ensure clean state
      debugLogger.clearBuffer();
      debugLogger.setOptions({ maxBufferSize: 100 });
      
      // Log with pipe separator in message
      debugLogger.log({
        prefix: ['DEBUG', 'CUSTOM'],
        message: 'Custom operation started | with additional info',
        data: { unrelatedField: 'value' },
      });

      // Log without pipe separator
      debugLogger.log({
        prefix: ['DEBUG', 'SIMPLE'],
        message: 'Simple message without pipe',
      });

      const formatted = debugLogger.formatLogs('succinct');
      expect(formatted).toHaveLength(2);
      
      // Should use text before pipe as identifier
      expect(formatted[0]).toContain('[DEBUG][CUSTOM] Custom operation started');
      
      // Should not have identifier if no pipe and no relevant data
      expect(formatted[1]).toMatch(/\[DEBUG\]\[SIMPLE\]\s*(\[|$)/);
    });
  });

  describe('console logging', () => {
    it('should not log to console by default', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { /* no-op */ });
      
      debugLogger.log({
        prefix: ['DEBUG'],
        message: 'Test',
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log to console when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { /* no-op */ });
      debugLogger.setOptions({ enableConsole: true });
      
      debugLogger.log({
        prefix: ['DEBUG'],
        message: 'Test',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});