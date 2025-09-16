'use client';

import { useCallback, useState } from 'react';
import { Bug, Copy, X } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { debugLogger } from '~/lib/debug/debug-logger';

interface DebugLogsWidgetProps {
  title: string;
  content: string;
  onClose?: () => void;
}

interface Filter {
  id: string;
  text: string;
  isNegative: boolean; // true for ![RENDER], false for [API]
}

export function DebugLogsWidget({ title, content, onClose }: DebugLogsWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mode, setMode] = useState<'full' | 'succinct'>('full');
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterInput, setFilterInput] = useState('');

  // Check if this is an interactive debug widget (has INTERACTIVE_CONTROLS)
  const isInteractive = content.includes('{{INTERACTIVE_CONTROLS:');

  // Generate current logs based on state
  const getCurrentLogs = useCallback(() => {
    const logs = debugLogger.formatLogs(mode, showAll ? undefined : 100);
    if (logs.length === 0) {
      return 'No debug logs available.';
    }

    // Remove timestamps from individual log lines
    let cleanLogs = logs.map(log => {
      return log.replace(/^\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+/, '');
    });


    // Apply custom filters
    cleanLogs = cleanLogs.filter(log => {
      const positiveFilters = filters.filter(f => !f.isNegative);
      const negativeFilters = filters.filter(f => f.isNegative);

      // If there are positive filters, log must match at least one (OR logic)
      const passesPositiveFilters = positiveFilters.length === 0 ||
        positiveFilters.some(filter => log.includes(filter.text));

      // Log must not match any negative filters (AND logic for exclusions)
      const passesNegativeFilters = negativeFilters.every(filter =>
        !log.includes(filter.text)
      );

      return passesPositiveFilters && passesNegativeFilters;
    });

    return cleanLogs.join('\n');
  }, [mode, showAll, filters]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentLogs());
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  // Handle adding a filter
  const handleAddFilter = () => {
    const trimmed = filterInput.trim();
    if (!trimmed) return;

    let filterText = trimmed;
    let isNegative = false;

    // Check for negative filter pattern ![TEXT]
    if (trimmed.startsWith('!')) {
      isNegative = true;
      filterText = trimmed.slice(1);
    }

    // Generate unique ID
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const newFilter: Filter = {
      id,
      text: filterText,
      isNegative
    };

    setFilters(prev => [...prev, newFilter]);
    setFilterInput('');
  };

  // Handle removing a filter
  const handleRemoveFilter = (id: string) => {
    setFilters(prev => prev.filter(filter => filter.id !== id));
  };

  // Handle Enter key in filter input
  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFilter();
    }
  };

  // Render content based on type
  const renderContent = () => {
    if (isInteractive) {
      const logs = getCurrentLogs();
      return (
        <div className="space-y-4">
          {/* Controls at the top */}
          <div className="space-y-3">
            {/* Mode and Limit toggles with Copy button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Mode Toggle */}
                <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-md p-1">
                  <button
                    type="button"
                    onClick={() => setMode('full')}
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
                    onClick={() => setMode('succinct')}
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
                    onClick={() => setShowAll(false)}
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
                    onClick={() => setShowAll(true)}
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
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>

            {/* Filter Input and Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={filterInput}
                  onChange={(e) => setFilterInput(e.target.value)}
                  onKeyDown={handleFilterKeyDown}
                  placeholder="Add filter (e.g., [API] or ![RENDER])"
                  className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAddFilter}
                  className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral border border-neutral-200 dark:border-neutral-600 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Filter Tags */}
              {filters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-md"
                    >
                      <span>{filter.isNegative ? '!' : ''}{filter.text}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter(filter.id)}
                        className="hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Logs display */}
          <pre className="bg-neutral-100 dark:bg-neutral-700 p-3 rounded text-sm overflow-x-auto">
            <code>{logs}</code>
          </pre>
        </div>
      );
    }

    // Handle legacy content - simple markdown rendering
    if (content.includes('```')) {
      const parts = content.split(/(```[\s\S]*?```)/);
      return (
        <div className="space-y-2">
          {parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
              const code = part.slice(3, -3).trim();
              return (
                <pre key={index} className="bg-neutral-100 dark:bg-neutral-700 p-3 rounded text-sm overflow-x-auto">
                  <code>{code}</code>
                </pre>
              );
            }
            return (
              <div key={index} className="text-sm">
                {part.split('\n').map((line, lineIndex) => {
                  if (line.startsWith('• ')) {
                    return (
                      <div key={lineIndex} className="flex items-start mb-1">
                        <span className="text-neutral-500 mt-0.5 mr-1">•</span>
                        <span>{line.slice(2)}</span>
                      </div>
                    );
                  }
                  if (line.includes('**') && line.includes('**')) {
                    const boldParts = line.split(/(\*\*[^*]+\*\*)/);
                    return (
                      <div key={lineIndex} className="mb-1">
                        {boldParts.map((boldPart, boldIndex) =>
                          boldPart.startsWith('**') && boldPart.endsWith('**') ? (
                            <strong key={boldIndex} className="font-semibold">
                              {boldPart.slice(2, -2)}
                            </strong>
                          ) : (
                            boldPart
                          )
                        )}
                      </div>
                    );
                  }
                  return line ? <div key={lineIndex} className="mb-1">{line}</div> : null;
                })}
              </div>
            );
          })}
        </div>
      );
    }

    return <div className="text-sm">{content}</div>;
  };

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<Bug className="h-4 w-4 text-destructive" />}
        title={title}
        onClose={onClose}
        collapsible={true}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((v) => !v)}
      />

      <WidgetContent isCollapsed={isCollapsed}>
        <div className="text-sm leading-tight">
          {renderContent()}
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}