'use client';

import { Key } from 'lucide-react';

interface PasswordFieldInputProps {
  value: string;
  onChange: (password: string) => void;
  isLoading: boolean;
  mode: 'login' | 'register';
}

export function PasswordFieldInput({ value, onChange, isLoading, mode }: PasswordFieldInputProps) {
  return (
    <div>
      <label htmlFor="password-field" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        Password
      </label>
      <div className="relative">
        <Key className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" aria-hidden="true" focusable="false" />
        <input
          id="password-field"
          type="password"
          name="password"
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
          placeholder="••••••••"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
