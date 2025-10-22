interface ExpirationFieldProps {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  disabled: boolean;
}

export function ExpirationField({ value, onChange, disabled }: ExpirationFieldProps) {
  return (
    <div>
      <label htmlFor="expires-at" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        Expires At (optional)
      </label>
      <input
        id="expires-at"
        type="datetime-local"
        value={value ? value.toISOString().slice(0, 16) : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : undefined)}
        className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-background dark:bg-neutral-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary [color-scheme:light] dark:[color-scheme:dark]"
        disabled={disabled}
        autoComplete="off"
      />
    </div>
  );
}
