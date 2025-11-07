'use client';

import { Mail } from 'lucide-react';
import { Input } from '~/app/components';

interface EmailFieldProps {
  value: string;
  onChange: (email: string) => void;
  isLoading: boolean;
  autoFocus?: boolean;
  mode: 'login' | 'register';
}

export function EmailField({ value, onChange, isLoading, autoFocus = false, mode }: EmailFieldProps) {
  // Use different autocomplete for login vs register to prevent browser confusion
  const autocompleteValue = mode === 'login' ? 'username email' : 'email';

  return (
    <Input
      id="email-field"
      type="email"
      name="email"
      inputMode="email"
      label="Email"
      icon={<Mail className="h-4 w-4" />}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="you@example.com"
      autoComplete={autocompleteValue}
      autoCapitalize="none"
      spellCheck={false}
      autoFocus={autoFocus}
      required
      disabled={isLoading}
    />
  );
}
