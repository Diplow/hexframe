'use client';

import { Mail, Key, User } from 'lucide-react';

interface FormFieldsProps {
  mode: 'login' | 'register';
  username: string;
  email: string;
  password: string;
  isLoading: boolean;
  onUsernameChange: (username: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
}

export function FormFields({
  mode,
  username,
  email,
  password,
  isLoading,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
}: FormFieldsProps) {
  return (
    <>
      {mode === 'register' && (
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                       bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
              placeholder="johndoe"
              required
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                     bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Password
        </label>
        <div className="relative">
          <Key className="absolute left-2 top-2.5 h-4 w-4 text-secondary-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-secondary-300 dark:border-secondary-700 rounded-md 
                     bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-secondary-500"
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
        </div>
      </div>
    </>
  );
}