'use client';

import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

interface WidgetActionProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
  size?: 'sm' | 'md' | 'lg';
}

const alignmentStyles: Record<'left' | 'center' | 'right' | 'between', string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'gap-1',
  md: 'gap-2',
  lg: 'gap-3',
};

export function WidgetActions({
  children,
  className,
  align = 'right',
  size = 'md',
}: WidgetActionProps) {
  return (
    <div
      className={cn(
        'flex items-center flex-wrap',
        alignmentStyles[align],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </div>
  );
}