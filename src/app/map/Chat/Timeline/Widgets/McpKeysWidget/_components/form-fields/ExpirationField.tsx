import { Input } from '~/app/components';

interface ExpirationFieldProps {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  disabled: boolean;
}

export function ExpirationField({ value, onChange, disabled }: ExpirationFieldProps) {
  return (
    <Input
      id="expires-at"
      type="datetime-local"
      label="Expires At (optional)"
      value={value ? value.toISOString().slice(0, 16) : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : undefined)}
      disabled={disabled}
      autoComplete="off"
      className="[color-scheme:light] dark:[color-scheme:dark]"
    />
  );
}
