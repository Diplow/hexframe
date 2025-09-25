// Test file for React hooks and common patterns
// These should demonstrate proper vs improper detection

import { useEffect, useState, useCallback, useMemo } from 'react';

// Real function that should be detected
export function useCustomHook() {
  const [state, setState] = useState(null);

  // These are hook calls, NOT function declarations
  useEffect(() => {
    // Complex effect with nested function calls
    const cleanup = () => {
      console.log('cleaning up');
    };

    const handler = (event: any) => {
      setState(event.data);
    };

    window.addEventListener('message', handler);

    return () => {
      cleanup();
      window.removeEventListener('message', handler);
    };
  }, []);

  // Another hook call with complex dependencies
  useEffect(() => {
    if (state) {
      dispatch({
        type: 'state_changed',
        payload: {
          newState: state,
          timestamp: Date.now(),
          source: 'useCustomHook',
        },
      });
    }
  }, [state]);

  // useCallback - should NOT be detected as function declaration
  const handleClick = useCallback((event: MouseEvent) => {
    dispatch({
      type: 'click',
      payload: {
        target: event.target,
        position: { x: event.clientX, y: event.clientY },
      },
    });
  }, []);

  // useMemo - should NOT be detected as function declaration
  const memoizedValue = useMemo(() => {
    return calculateExpensiveValue({
      input: state,
      options: {
        precision: 2,
        format: 'json',
      },
    });
  }, [state]);

  return { state, handleClick, memoizedValue };
}

// React component function - should be detected
export function TestComponent() {
  // Hook calls - should NOT be detected as function declarations
  useEffect(() => {
    const subscription = eventBus.on('test.*', (event: any) => {
      console.log('received event:', event);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Event handler function - should be detected as function declaration
  const handleSubmit = (data: any) => {
    dispatch({
      type: 'form_submit',
      payload: {
        formData: data,
        submittedAt: new Date(),
        source: 'TestComponent',
      },
    });
  };

  return null; // JSX would go here
}

// Utility functions - should be detected
export const calculateExpensiveValue = (config: any) => {
  // Some expensive calculation
  return config.input * 2;
};

export async function fetchData(url: string) {
  // Function calls, not declarations
  const response = await fetch(url);
  return response.json();
}