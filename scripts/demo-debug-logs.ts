#!/usr/bin/env ts-node

import { debugLogger, loggers } from '../src/lib/debug/debug-logger';

// Enable console logging for demo
debugLogger.setOptions({ enableConsole: true });

console.log('=== Debug Logger Demo ===\n');

// Simulate various log entries
console.log('1. Generating various debug logs...\n');

// Canvas renders (will be grouped in succinct mode)
for (let i = 0; i < 5; i++) {
  loggers.render.canvas('DynamicMapCanvas render', {
    center: 'tile-123',
    itemCount: 42,
  });
}

// API calls
loggers.api('GET /api/map/tile/123', { status: 200 });
loggers.api('POST /api/map/tile', { status: 201, id: 'tile-456' });

// Map cache operations
loggers.mapCache.handlers('Tile data fetched', { tileId: 'tile-123' });
loggers.mapCache.handlers('Cache invalidated', { region: 'center' });

// More canvas renders
for (let i = 0; i < 3; i++) {
  loggers.render.canvas('DynamicMapCanvas render', {
    center: 'tile-123',
    itemCount: 42,
  });
}

// Chat operations
loggers.chat.handlers('Message sent', { actor: 'user' });
loggers.chat.handlers('Widget rendered', { type: 'preview' });

// Event bus
loggers.eventBus('Event emitted', { type: 'map.tile_selected' });
loggers.eventBus('Event emitted', { type: 'map.tile_selected' });
loggers.eventBus('Event emitted', { type: 'map.tile_selected' });

console.log('\n2. Full Mode Output:\n');
const fullLogs = debugLogger.formatLogs('full');
console.log('Total logs:', fullLogs.length);
console.log('Last 10 logs:');
fullLogs.slice(-10).forEach(log => console.log(log));

console.log('\n3. Succinct Mode Output (with grouping):\n');
const succinctLogs = debugLogger.formatLogs('succinct');
console.log('Total groups:', succinctLogs.length);
console.log('All groups:');
succinctLogs.forEach(log => console.log(log));

console.log('\n=== Demo Complete ===');

// Show how it would look in chat
console.log('\n4. How it would appear in chat:\n');
console.log('User: /debug succinct');
console.log('System:', `**Debug Logs (Succinct Mode - Last ${succinctLogs.length} of ${succinctLogs.length} groups):**
\`\`\`
${succinctLogs.join('\n')}
\`\`\``);

process.exit(0);