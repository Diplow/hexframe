import { formatDate } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_helpers/key-utils';

interface KeyDatesProps {
  createdAt: Date;
  expiresAt: Date | null;
}

export function KeyDates({ createdAt, expiresAt }: KeyDatesProps) {
  return (
    <div className="text-xs text-secondary-600 dark:text-secondary-400 space-y-0.5">
      <p>Created: {formatDate(createdAt)}</p>
      {expiresAt ? (
        <p>Expires: {formatDate(expiresAt)}</p>
      ) : (
        <p className="flex items-center gap-1">
          Expires: none
          <svg
            className="w-3 h-3 text-warning dark:text-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </p>
      )}
    </div>
  );
}
