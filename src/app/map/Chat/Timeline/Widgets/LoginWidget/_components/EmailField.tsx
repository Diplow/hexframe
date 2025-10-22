'use client';

import { Mail } from 'lucide-react';

interface EmailFieldProps {
  value: string;
  onChange: (email: string) => void;
  isLoading: boolean;
  autoFocus?: boolean;
}

export function EmailField({ value, onChange, isLoading, autoFocus = false }: EmailFieldProps) {
  return (
    <div>
      <label htmlFor="email-field" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        Email
      </label>
      <div className="relative">
        <Mail className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" aria-hidden="true" focusable="false" />
        <input
          id="email-field"
          type="email"
          name="email"
          inputMode="email"
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
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          required
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
