'use client';

import type { RefObject } from "react";

import { Send, Lock } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { CommandAutocomplete } from '~/app/map/Chat/Input/_components/CommandAutocomplete';

interface CommandSuggestion {
  command: string;
  description: string;
  isExact?: boolean;
}

interface InputFormProps {
  message: string;
  showAutocomplete: boolean;
  suggestions: CommandSuggestion[];
  selectedSuggestionIndex: number;
  textareaRef: RefObject<HTMLTextAreaElement>;
  isDisabled?: boolean;
  onMessageChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onSelectSuggestion: (command: string) => void;
  onCloseAutocomplete: () => void;
}

export function InputForm({
  message,
  showAutocomplete,
  suggestions,
  selectedSuggestionIndex,
  textareaRef,
  isDisabled = false,
  onMessageChange,
  onKeyDown,
  onSend,
  onSelectSuggestion,
  onCloseAutocomplete
}: InputFormProps) {
  return (
    <div className="relative">
      {showAutocomplete && (
        <CommandAutocomplete
          suggestions={suggestions}
          selectedIndex={selectedSuggestionIndex}
          onSelect={onSelectSuggestion}
          _onClose={onCloseAutocomplete}
          inputRef={textareaRef}
        />
      )}
      {isDisabled && (
        <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-t border-[color:var(--stroke-color-950)]">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Lock className="h-4 w-4" />
            <span>Please log in to use the chat</span>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 p-4 border-t border-[color:var(--stroke-color-950)]">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isDisabled ? "Log in to chat..." : "Type a message..."}
          disabled={isDisabled}
          className="flex-1 resize-none rounded-lg px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
          rows={1}
          data-testid="chat-input"
          data-chat-input
        />
        <Button
          onClick={onSend}
          disabled={!message.trim() || isDisabled}
          size="sm"
          className="h-10 w-10 p-0"
          data-testid="send-button"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}