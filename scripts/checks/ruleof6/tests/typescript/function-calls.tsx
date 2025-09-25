// Test file for function calls that should NOT be detected as function declarations
// These are all function CALLS, not function declarations

import { useEffect } from 'react';

// Function calls that currently cause false positives
export function testFunctionCalls() {
  // This is a function call with an object argument - should NOT be counted as a function declaration
  dispatch({
    type: 'message',
    payload: {
      content: 'test content',
      actor: 'system',
    },
    id: 'debug-test',
    timestamp: new Date(),
    actor: 'system',
  });

  // This is a React hook call - should NOT be counted as a function declaration
  useEffect(() => {
    console.log('effect running');
    return () => {
      console.log('cleanup');
    };
  }, []);

  // EventBus method call - should NOT be counted as a function declaration
  eventBus.on('map.*', (event) => {
    console.log('event received', event);
  });

  // Another function call with multiple arguments
  someFunction(
    'first argument',
    {
      nested: 'object',
      with: 'multiple properties',
      and: {
        deeply: 'nested values'
      }
    },
    [1, 2, 3, 4, 5]
  );

  // Method chaining - should NOT be function declarations
  api
    .get('/endpoint')
    .then(response => response.json())
    .catch(error => console.error(error));
}

// This IS a real function declaration and should be detected
export function realFunction() {
  return 'this should be detected';
}

// This IS a real arrow function and should be detected
export const arrowFunction = () => {
  return 'this should also be detected';
};