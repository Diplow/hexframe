'use client';

type ItemTypeValue = 'organizational' | 'context' | 'system';

interface TypeSelectorFieldProps {
  value: ItemTypeValue;
  onChange: (value: ItemTypeValue) => void;
  disabled?: boolean;
}

const TYPE_OPTIONS: { value: ItemTypeValue; label: string }[] = [
  { value: 'organizational', label: 'Organizational' },
  { value: 'context', label: 'Context' },
  { value: 'system', label: 'System' },
];

export function _TypeSelectorField({
  value,
  onChange,
  disabled = false,
}: TypeSelectorFieldProps) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">
        Type
      </label>
      <select
        value={value}
        onChange={(e) => {
          const newValue = e.target.value as ItemTypeValue;
          if (newValue !== value) {
            onChange(newValue);
          }
        }}
        disabled={disabled}
        className="w-full p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
