import { test, expect } from './utils/event-bus-observer';

test.describe('Map Navigation Events', () => {
  test.beforeEach(async ({ page, eventBusObserver }) => {
    // Start on the map page
    await page.goto('/map');
    
    // Wait for the map to load
    await page.waitForSelector('[data-testid="hex-tile"]', { timeout: 10000 });
    
    // Start observing events
    await eventBusObserver.startObserving();
  });

  test.afterEach(async ({ eventBusObserver }) => {
    await eventBusObserver.stopObserving();
  });

  test('should emit navigation events when clicking tiles', async ({ page, eventBusObserver }) => {
    // Find a child tile and click it
    const childTile = page.locator('[data-testid="hex-tile"]').nth(1);
    await childTile.click();
    
    // Stop observing to capture events
    await eventBusObserver.stopObserving();
    
    // Verify navigation event was emitted
    eventBusObserver.expectEvent('map.navigation');
    
    // Verify related logs
    eventBusObserver.expectLog('NAV', 'Navigating to item');
    
    // Check that map cache events were triggered
    const mapEvents = eventBusObserver.getEventsByType('map.cache_updated');
    expect(mapEvents.length).toBeGreaterThan(0);
  });

  test('should emit tile expansion events', async ({ page, eventBusObserver }) => {
    // Double-click a tile to expand it
    const tile = page.locator('[data-testid="hex-tile"]').first();
    await tile.dblclick();
    
    await eventBusObserver.stopObserving();
    
    // Verify expansion event
    eventBusObserver.expectEvent('map.tile_expanded');
    
    // Verify logs show expansion
    eventBusObserver.expectLog('CACHE', 'tile expanded');
  });

  test('should emit drag and drop events', async ({ page, eventBusObserver }) => {
    // Get source and target tiles
    const sourceTile = page.locator('[data-testid="hex-tile"]').nth(1);
    const targetTile = page.locator('[data-testid="hex-tile"]').nth(2);
    
    // Perform drag and drop
    await sourceTile.dragTo(targetTile);
    
    // Wait a bit for events to be processed
    await page.waitForTimeout(500);
    
    await eventBusObserver.stopObserving();
    
    // Verify swap event was emitted
    eventBusObserver.expectEvent('map.tiles_swapped');
    
    // Check for drag-related logs
    const dragLogs = eventBusObserver.getLogsByPrefix('DRAG');
    expect(dragLogs.length).toBeGreaterThan(0);
  });

  test('should track event flow for tile creation', async ({ page, eventBusObserver }) => {
    // Click on an empty tile slot to create a new tile
    const emptySlot = page.locator('[data-testid="empty-tile-slot"]').first();
    
    if (await emptySlot.isVisible()) {
      await emptySlot.click();
      
      // Fill in the creation form if it appears
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Tile');
        await page.locator('button[type="submit"]').click();
      }
      
      await eventBusObserver.stopObserving();
      
      // Verify creation event
      eventBusObserver.expectEvent('map.tile_created');
      
      // Verify the event flow
      const events = eventBusObserver.getEvents();
      const creationIndex = events.findIndex(e => e.type === 'map.tile_created');
      const cacheUpdateIndex = events.findIndex(e => e.type === 'map.cache_updated');
      
      // Cache should be updated after creation
      expect(cacheUpdateIndex).toBeGreaterThan(creationIndex);
    }
  });

  test('should observe auth events affecting map', async ({ page, eventBusObserver }) => {
    // Simulate logout to see auth events
    await page.evaluate(() => {
      // Trigger a logout event
      if ((window as any).eventBus) {
        (window as any).eventBus.emit({
          type: 'auth.logout',
          source: 'test',
          payload: {}
        });
      }
    });
    
    await page.waitForTimeout(500);
    await eventBusObserver.stopObserving();
    
    // Verify auth event was emitted
    eventBusObserver.expectEvent('auth.logout');
    
    // Verify map reacted to auth change
    const authLogs = eventBusObserver.getLogsByPrefix('AUTH');
    expect(authLogs.length).toBeGreaterThan(0);
  });

  test('should track performance through event timing', async ({ page, eventBusObserver }) => {
    // Navigate to a different tile
    const tile = page.locator('[data-testid="hex-tile"]').nth(1);
    await tile.click();
    
    await eventBusObserver.stopObserving();
    
    // Get all events related to this navigation
    const navEvent = eventBusObserver.getEvents().find(e => e.type === 'map.navigation');
    const cacheEvents = eventBusObserver.getEventsByType('map.cache_updated');
    
    if (navEvent && cacheEvents.length > 0) {
      // Parse timestamps
      const navTime = new Date(navEvent.timestamp).getTime();
      const cacheTime = new Date(cacheEvents[0].timestamp).getTime();
      
      // Cache update should happen within 1 second of navigation
      const timeDiff = cacheTime - navTime;
      expect(timeDiff).toBeLessThan(1000);
    }
  });
});