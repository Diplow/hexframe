interface EmptyStateProps {
  onCreateKey: () => void;
}

export function EmptyState({ onCreateKey }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <div className="text-secondary-500 dark:text-secondary-400 mb-4">
        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
          />
        </svg>
        <p>No API keys found</p>
      </div>
      <p className="text-sm text-secondary-600 dark:text-secondary-400">
        <button onClick={onCreateKey} className="text-primary hover:text-primary/80 underline font-medium">
          Create your first API key
        </button>{' '}
        to enable MCP access with Claude Code.
      </p>
    </div>
  );
}
