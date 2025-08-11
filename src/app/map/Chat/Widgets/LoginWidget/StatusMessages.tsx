'use client';

interface StatusMessagesProps {
  error: string;
  success: string;
}

export function StatusMessages({ error, success }: StatusMessagesProps) {
  return (
    <>
      {error && (
        <div className="text-sm text-destructive-600 dark:text-destructive-400">
          {error}
        </div>
      )}
      
      {success && (
        <div className="text-sm text-success">
          {success}
        </div>
      )}
    </>
  );
}