'use client';

interface StatusMessagesProps {
  error: string;
}

export function StatusMessages({ error }: StatusMessagesProps) {
  if (!error) return null;

  return (
    <div className="p-3 bg-destructive-50 dark:bg-destructive-900/20 border border-destructive-200 dark:border-destructive-800 rounded-md">
      <p className="text-sm text-destructive-800 dark:text-destructive-200">{error}</p>
    </div>
  );
}