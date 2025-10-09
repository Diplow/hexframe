import { Copy } from 'lucide-react';

interface FilterTogglesProps {
  mode: 'full' | 'succinct';
  showAll: boolean;
  onModeChange: (mode: 'full' | 'succinct') => void;
  onShowAllChange: (showAll: boolean) => void;
  onCopy: () => void;
}

export function FilterToggles({
  mode,
  showAll,
  onModeChange,
  onShowAllChange,
  onCopy,
}: FilterTogglesProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {/* Mode Toggle */}
        <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-md p-1">
          <button
            type="button"
            onClick={() => onModeChange('full')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              mode === 'full'
                ? 'bg-white dark:bg-neutral-600 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Full
          </button>
          <button
            type="button"
            onClick={() => onModeChange('succinct')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              mode === 'succinct'
                ? 'bg-white dark:bg-neutral-600 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Succinct
          </button>
        </div>

        {/* Limit Toggle */}
        <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-md p-1">
          <button
            type="button"
            onClick={() => onShowAllChange(false)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              !showAll
                ? 'bg-white dark:bg-neutral-600 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Last 100
          </button>
          <button
            type="button"
            onClick={() => onShowAllChange(true)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              showAll
                ? 'bg-white dark:bg-neutral-600 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Copy Button */}
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy current logs to clipboard"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
      >
        <Copy className="h-4 w-4" />
        Copy
      </button>
    </div>
  );
}
