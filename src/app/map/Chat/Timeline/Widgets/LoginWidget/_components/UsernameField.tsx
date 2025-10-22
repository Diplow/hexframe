'use client';

import { User } from 'lucide-react';

interface UsernameFieldProps {
  value: string;
  onChange: (username: string) => void;
  isLoading: boolean;
}

export function UsernameField({ value, onChange, isLoading }: UsernameFieldProps) {
  return (
    <div>
      <label htmlFor="username-field" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        Username
      </label>
      <div className="relative">
        <User className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" aria-hidden="true" focusable="false" />
        <input
          id="username-field"
          type="text"
          name="username"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md
                   bg-background dark:bg-neutral-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          style={{
            WebkitBoxShadow: 'inset 0 0 0 1000px var(--background)',
            boxShadow: 'inset 0 0 0 1000px var(--background)',
            WebkitTextFillColor: 'var(--foreground)',
            color: 'var(--foreground)',
          }}
          placeholder="johndoe"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={true}
          required
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
