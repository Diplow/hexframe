'use client';

import { User } from 'lucide-react';
import { Input } from '~/app/components';

interface UsernameFieldProps {
  value: string;
  onChange: (username: string) => void;
  isLoading: boolean;
}

export function UsernameField({ value, onChange, isLoading }: UsernameFieldProps) {
  return (
    <Input
      id="username-field"
      type="text"
      name="username"
      label="Username"
      icon={<User className="h-4 w-4" />}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="johndoe"
      autoComplete="username"
      autoCapitalize="none"
      spellCheck={false}
      autoFocus={true}
      required
      disabled={isLoading}
    />
  );
}
