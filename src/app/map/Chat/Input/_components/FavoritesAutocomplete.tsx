'use client';

import type { RefObject } from "react";
import type { FavoriteMatch } from '~/app/map/Chat/Input/_hooks/autocomplete/use-favorites-autocomplete';

import { useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

interface FavoritesAutocompleteProps {
  suggestions: FavoriteMatch[];
  selectedIndex: number;
  onSelect: (shortcutName: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

export function FavoritesAutocomplete({
  suggestions,
  selectedIndex,
  onSelect,
  inputRef
}: FavoritesAutocompleteProps) {
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
      data-testid="favorites-autocomplete"
      className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
    >
      <div className="p-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Star className="w-3 h-3" />
          Favorites
        </div>
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.mapItemId}
            data-testid="favorite-suggestion"
            onClick={() => onSelect(suggestion.shortcutName)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              index === selectedIndex
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono font-medium">
                  @{suggestion.shortcutName}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
