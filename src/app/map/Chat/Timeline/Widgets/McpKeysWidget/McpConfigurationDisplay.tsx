'use client';

import { useState } from 'react';
import { generateMcpInstructions } from '~/lib/utils/mcp-config';

interface McpConfigurationDisplayProps {
  apiKey: string;
  serverName?: string;
}

export function McpConfigurationDisplay({ apiKey, serverName = 'hexframe' }: McpConfigurationDisplayProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const mcpConfig = generateMcpInstructions(apiKey, serverName);

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(mcpConfig.configJson);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Environment Badge and Title */}
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
          mcpConfig.environment.isProduction
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
        }`}>
          {mcpConfig.environment.isProduction ? 'Production' : 'Local Development'}
        </span>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-xs text-success-600 dark:text-success-400 hover:text-success-800 dark:hover:text-success-300 underline"
        >
          {showInstructions ? 'Hide' : 'Show'} setup instructions
        </button>
      </div>

      {/* Configuration JSON */}
      <div className="relative">
        <pre className="p-3 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded border font-mono overflow-x-auto max-h-32 overflow-y-auto">
          {mcpConfig.configJson}
        </pre>
        <button
          onClick={() => void handleCopyConfig()}
          className={`absolute top-2 right-2 p-1.5 border rounded transition-colors ${
            copyFeedback
              ? 'text-success-600 dark:text-success-400 bg-success/10 dark:bg-success/20 border-success/30 dark:border-success/30'
              : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100/80 dark:bg-neutral-700/80 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-600'
          }`}
          aria-label={copyFeedback ? "Copied to clipboard" : "Copy configuration"}
        >
          {copyFeedback ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Setup Instructions */}
      {showInstructions && (
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded border">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
            {mcpConfig.description}
          </p>
          <ol className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1 list-decimal list-inside">
            {mcpConfig.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>

          {/* Environment-specific notes */}
          {mcpConfig.environment.isLocal && (
            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
              <p className="text-xs text-orange-800 dark:text-orange-200">
                <strong>Note:</strong> This configuration uses stdio transport and requires your local Hexframe server to be running.
              </p>
            </div>
          )}

          {mcpConfig.environment.isProduction && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> This configuration uses HTTP transport and connects directly to your deployed Hexframe instance.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}