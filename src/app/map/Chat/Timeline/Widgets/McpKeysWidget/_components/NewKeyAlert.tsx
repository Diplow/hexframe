import type { CreateKeyResult } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/useMcpKeys';
import { McpConfigurationDisplay } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/McpConfigurationDisplay';

interface NewKeyAlertProps {
  newlyCreatedKey: CreateKeyResult;
  copyFeedback: boolean;
  onCopy: (text: string) => void;
  onDismiss: () => void;
}

export function NewKeyAlert({ newlyCreatedKey, copyFeedback, onCopy, onDismiss }: NewKeyAlertProps) {
  return (
    <div className="p-4 bg-success/30 border border-transparent rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h5 className="font-semibold text-success-800 dark:text-success-200">
            API Key Created: {newlyCreatedKey.name}
          </h5>
        </div>
        <button onClick={onDismiss} className="p-1 text-success-400 hover:text-success-600 dark:hover:text-success-300">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-success-700 dark:text-success-300">
          <strong>Copy your secret key now - it won&apos;t be shown again!</strong>
        </p>

        <div className="space-y-3">
          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-success-700 dark:text-success-300 mb-1">
              API Key (save this securely)
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded border select-all font-mono">
                {newlyCreatedKey.key}
              </code>
              <button
                onClick={() => onCopy(newlyCreatedKey.key)}
                className={`p-2 border rounded transition-colors ${
                  copyFeedback
                    ? 'text-success-600 dark:text-success-400 bg-success/10 dark:bg-success/20 border-success/30 dark:border-success/30'
                    : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                }`}
                aria-label={copyFeedback ? 'Copied to clipboard' : 'Copy API key'}
              >
                {copyFeedback ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* MCP Configuration */}
          <div>
            <label className="block text-xs font-medium text-success-700 dark:text-success-300 mb-1">
              Claude Desktop Configuration
            </label>
            <McpConfigurationDisplay apiKey={newlyCreatedKey.key} />
          </div>
        </div>
      </div>
    </div>
  );
}
