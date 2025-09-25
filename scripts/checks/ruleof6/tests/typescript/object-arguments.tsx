// Test file for object arguments that should be counted correctly
// These test various argument counting scenarios

// Function with single object argument - should count as 1 argument, not multiple
export function testSingleObjectArg() {
  dispatch({
    type: 'tile_selected',
    payload: {
      tileId: 'test-tile',
      tileData: {
        id: '123',
        title: 'Test Title',
        description: 'Test Description',
        content: 'Test Content',
        coordId: 'coord-123',
      },
      openInEditMode: true,
    },
    id: 'chat-123',
    timestamp: new Date(),
    actor: 'system',
  });
}

// Function with multiple real arguments - should count correctly
export function testMultipleArgs(a: string, b: number, c: boolean) {
  return a + b + c;
}

// Function with mixed arguments - should count as 3 arguments
export function testMixedArgs(
  name: string,
  config: {
    enabled: boolean,
    timeout: number,
    retries: number,
  },
  callback: (result: any) => void
) {
  callback({ name, config });
}

// Function with array argument - should count as 2 arguments
export function testArrayArg(
  items: [string, number, boolean, object, null],
  processor: (item: any) => any
) {
  return items.map(processor);
}

// Complex nested object argument - should count as 1 argument
export function testComplexNested() {
  api.call({
    method: 'POST',
    url: '/api/endpoint',
    data: {
      user: {
        id: 123,
        profile: {
          name: 'Test User',
          settings: {
            theme: 'dark',
            notifications: {
              email: true,
              push: false,
            },
          },
        },
      },
      metadata: {
        source: 'web',
        timestamp: Date.now(),
        session: {
          id: 'session-123',
          duration: 3600,
        },
      },
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token',
    },
  });
}

// Function with destructured object parameter - should count as 1 argument
export function testDestructured({ id, name, config, metadata }: {
  id: string;
  name: string;
  config: object;
  metadata: any;
}) {
  return { id, name, config, metadata };
}