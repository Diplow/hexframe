interface StatusBadgeProps {
  expired: boolean;
  enabled: boolean;
}

export function StatusBadge({ expired, enabled }: StatusBadgeProps) {
  if (expired) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-destructive-100 dark:bg-destructive-800 text-destructive-800 dark:text-destructive-200 rounded-full">
        Expired
      </span>
    );
  }

  if (!enabled) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full">
        Disabled
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 text-xs font-medium bg-success/10 dark:bg-success/20 text-success dark:text-success rounded-full">
      Active
    </span>
  );
}
