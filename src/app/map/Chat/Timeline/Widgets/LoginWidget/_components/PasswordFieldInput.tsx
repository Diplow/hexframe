'use client';

import { Key } from 'lucide-react';
import { Input } from '~/app/components';

interface PasswordFieldInputProps {
  value: string;
  onChange: (password: string) => void;
  isLoading: boolean;
  mode: 'login' | 'register';
}

export function PasswordFieldInput({ value, onChange, isLoading, mode }: PasswordFieldInputProps) {
  return (
    <Input
      id="password-field"
      type="password"
      name="password"
      label="Password"
      icon={<Key className="h-4 w-4" />}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="••••••••"
      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      autoCapitalize="none"
      spellCheck={false}
      required
      disabled={isLoading}
    />
  );
}
