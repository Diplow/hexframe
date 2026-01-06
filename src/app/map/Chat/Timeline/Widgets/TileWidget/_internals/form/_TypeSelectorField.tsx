'use client';

import { api } from '~/commons/trpc/react';

// Built-in types that have special labels
const BUILT_IN_LABELS: Record<string, string> = {
  organizational: 'Organizational',
  context: 'Context',
  system: 'System',
};

// Types that should be excluded from the dropdown (reserved)
const EXCLUDED_TYPES = ['user'];

interface TypeSelectorFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function _formatTypeLabel(type: string): string {
  // Use built-in label if available
  if (BUILT_IN_LABELS[type]) {
    return BUILT_IN_LABELS[type];
  }
  // Capitalize first letter for custom types
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function _TypeSelectorField({
  value,
  onChange,
  disabled = false,
}: TypeSelectorFieldProps) {
  const { data, isLoading } = api.agentic.getEffectiveAllowlist.useQuery();

  // Filter out excluded types and create options
  const allowedTypes = (data?.allowedTypes ?? ['organizational', 'context', 'system'])
    .filter(type => !EXCLUDED_TYPES.includes(type));

  // Ensure current value is in the list (for display purposes)
  const hasCurrentValue = allowedTypes.includes(value);
  const displayTypes = hasCurrentValue ? allowedTypes : [value, ...allowedTypes];

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">
        Type
      </label>
      <select
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          if (newValue !== value) {
            onChange(newValue);
          }
        }}
        disabled={disabled || isLoading}
        className="w-full p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {displayTypes.map((type) => (
          <option key={type} value={type}>
            {_formatTypeLabel(type)}
          </option>
        ))}
      </select>
    </div>
  );
}
