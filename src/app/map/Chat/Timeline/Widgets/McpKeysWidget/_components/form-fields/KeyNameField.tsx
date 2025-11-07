import { Input } from '~/app/components';

interface KeyNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export function KeyNameField({ value, onChange, disabled }: KeyNameFieldProps) {
  return (
    <Input
      id="key-name"
      type="text"
      name="api-key-name"
      label="Key Name"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="e.g., Claude Code MCP"
      disabled={disabled}
      required
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
    />
  );
}
