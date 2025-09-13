'use client';

interface DebugLogsWidgetProps {
  title: string;
  content: string;
  onClose?: () => void;
}

export function DebugLogsWidget({ title, content, onClose }: DebugLogsWidgetProps) {
  return (
    <div className="w-full">
      <div className="bg-neutral-50 dark:bg-neutral-800/30 rounded-lg p-4 border-transparent relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            {title}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: content.replace(/```\n([\s\S]*?)\n```/g, '<pre class="bg-neutral-100 dark:bg-neutral-700 p-3 rounded text-sm overflow-x-auto"><code>$1</code></pre>').replace(/\{\{COPY_BUTTON:([^}]+)\}\}/g, '<button class="mt-2 px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/80" onclick="navigator.clipboard.writeText(atob(\'$1\'))">Copy Logs</button>') }} />
        </div>
      </div>
    </div>
  );
}