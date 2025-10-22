interface KeyListHeaderProps {
  keyCount: number;
  isLoading: boolean;
  onCreateKey: () => void;
  onRefresh: () => Promise<void>;
}

export function KeyListHeader({ keyCount, isLoading, onCreateKey, onRefresh }: KeyListHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Active Keys ({keyCount})</h4>
      <div className="flex items-center gap-2">
        <button
          onClick={onCreateKey}
          className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50"
          disabled={isLoading}
        >
          Create Key
        </button>
        <button
          onClick={() => void onRefresh()}
          className="p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
          disabled={isLoading}
          aria-label="Refresh keys"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
