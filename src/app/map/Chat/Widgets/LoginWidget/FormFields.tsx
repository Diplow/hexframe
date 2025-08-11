'use client';

import { Mail, Key, User } from 'lucide-react';

interface FormFieldsProps {
  mode: 'login' | 'register';
  values: {
    username: string;
    email: string;
    password: string;
  };
  isLoading: boolean;
  onChange: {
    username: (username: string) => void;
    email: (email: string) => void;
    password: (password: string) => void;
  };
}

export function FormFields({
  mode,
  values,
  isLoading,
  onChange,
}: FormFieldsProps) {
  const { username, email, password } = values;
  const { username: onUsernameChange, email: onEmailChange, password: onPasswordChange } = onChange;
  return (
    <>
      {mode === 'register' && (
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
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                       bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
              placeholder="johndoe"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus={mode === 'register'}
              required
              disabled={isLoading}
            />
          </div>
        </div>
      )}

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
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                     bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={mode === 'login'}
            required
            disabled={isLoading}
          />
        </div>
      </div>

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
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                     bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={isLoading}
          />
        </div>
      </div>
    </>
  );
}