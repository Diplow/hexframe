interface KeyNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export function KeyNameField({ value, onChange, disabled }: KeyNameFieldProps) {
  return (
    <div>
      <label htmlFor="key-name" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        Key Name
      </label>
      <input
        id="key-name"
        type="text"
        name="api-key-name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Claude Code MCP"
        className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-background dark:bg-neutral-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        disabled={disabled}
        required
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        role="textbox"
      />
    </div>
  );
}
