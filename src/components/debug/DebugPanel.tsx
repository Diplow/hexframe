'use client';

import { useEffect, useState, useRef } from 'react';
import { debugLogger } from '~/lib/debug/debug-logger';

export function DebugPanel() {
  const [logs, setLogs] = useState<Array<{
    timestamp: number;
    prefix: string;
    message: string;
    data?: Record<string, unknown>;
  }>>([]);
  const [isVisible, setIsVisible] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to debug logger updates
    const unsubscribe = debugLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    // Get initial buffer
    setLogs(debugLogger.getBuffer());

    return unsubscribe;
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg hover:bg-gray-700 z-50"
      >
        Show Debug Panel ({logs.length})
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-gray-900 text-gray-100 shadow-2xl rounded-tl-lg overflow-hidden flex flex-col z-50">
      <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
        <h3 className="font-semibold">Debug Logs</h3>
        <div className="flex gap-2">
          <button
            onClick={() => debugLogger.clearBuffer()}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Hide
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {logs.map((log, index) => (
          <div key={index} className="mb-2 border-b border-gray-800 pb-2">
            <div className="flex items-start gap-2">
              <span className="text-gray-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-blue-400">{log.prefix}</span>
            </div>
            <div className="ml-16 text-gray-300">{log.message}</div>
            {log.data && (
              <pre className="ml-16 text-gray-500 text-xs overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}