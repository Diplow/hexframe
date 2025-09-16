'use client';

import { cn } from '~/lib/utils';

interface HexagonIconProps {
  className?: string;
  size?: number;
  fillColor?: string;
  filled?: boolean;
}

export function HexagonIcon({ className, size = 16, fillColor, filled }: HexagonIconProps) {
  const shouldFill = filled ?? fillColor;
  const fill = shouldFill ? (fillColor ?? 'currentColor') : 'none';
  const stroke = shouldFill ? 'none' : 'currentColor';
  const strokeWidth = shouldFill ? 0 : 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('inline-block', !shouldFill && 'text-muted-foreground', className)}
    >
      <path
        d="M7.5 4.5L16.5 4.5C17.3 4.5 18 5.2 18.5 6L22 12L18.5 18C18 18.8 17.3 19.5 16.5 19.5L7.5 19.5C6.7 19.5 6 18.8 5.5 18L2 12L5.5 6C6 5.2 6.7 4.5 7.5 4.5Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill={fill}
      />
    </svg>
  );
}