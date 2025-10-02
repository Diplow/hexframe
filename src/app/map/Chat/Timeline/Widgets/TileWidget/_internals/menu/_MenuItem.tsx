'use client';

import type { LucideIcon } from 'lucide-react';

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

export function _MenuItem({ icon: Icon, label, onClick, variant = 'default' }: MenuItemProps) {
  const colorClass = variant === 'destructive'
    ? 'text-[color:var(--destructive-color-600)] dark:text-[color:var(--destructive-color-400)]'
    : '';

  return (
    <button
      className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${colorClass}`}
      onClick={onClick}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
