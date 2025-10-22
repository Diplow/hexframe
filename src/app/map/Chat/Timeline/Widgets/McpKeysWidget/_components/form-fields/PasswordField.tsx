interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export function PasswordField({ value, onChange, disabled }: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor="password" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        Confirm Password
      </label>
      <input
        id="password"
        type="password"
        name="security-verification"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your password"
        className="w-full px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-background dark:bg-neutral-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        disabled={disabled}
        required
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
      />
      <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
        Required for security verification
      </p>
    </div>
  );
}
