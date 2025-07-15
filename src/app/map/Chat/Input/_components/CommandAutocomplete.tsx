'use client';

import { useEffect, useRef } from 'react';
import { Command, Terminal } from 'lucide-react';

interface CommandSuggestion {
  command: string;
  description: string;
  isExact?: boolean;
}

interface CommandAutocompleteProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  onSelect: (command: string) => void;
  _onClose: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export function CommandAutocomplete({ 
  suggestions, 
  selectedIndex, 
  onSelect, 
  _onClose,
  inputRef 
}: CommandAutocompleteProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position dropdown relative to input
  useEffect(() => {
    if (!inputRef.current || !dropdownRef.current) return;

    const inputRect = inputRef.current.getBoundingClientRect();
    const dropdown = dropdownRef.current;
    
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${inputRect.top - dropdown.offsetHeight - 4}px`;
    dropdown.style.left = `${inputRect.left}px`;
    dropdown.style.width = `${Math.max(inputRect.width, 300)}px`;
    dropdown.style.zIndex = '50';
  }, [inputRef, suggestions]);

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
    >
      <div className="p-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Terminal className="w-3 h-3" />
          Commands
        </div>
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.command}
            onClick={() => onSelect(suggestion.command)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              index === selectedIndex
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Command className="w-3 h-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono font-medium">
                  {suggestion.command}
                </div>
                {suggestion.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {suggestion.description}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}