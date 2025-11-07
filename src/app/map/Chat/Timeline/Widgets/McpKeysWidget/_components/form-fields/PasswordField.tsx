import { Input } from '~/app/components';

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export function PasswordField({ value, onChange, disabled }: PasswordFieldProps) {
  return (
    <Input
      id="password"
      type="password"
      name="security-verification"
      label="Confirm Password"
      helperText="Required for security verification"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter your password"
      disabled={disabled}
      required
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      data-form-type="other"
      data-lpignore="true"
      data-1p-ignore="true"
    />
  );
}
