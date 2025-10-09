import type { McpKey } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/useMcpKeys';
import { formatDate, isExpired } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_helpers/key-utils';

interface KeyItemProps {
  keyData: McpKey;
  isRevoking: boolean;
  isConfirmingRevoke: boolean;
  onRevoke: () => void;
  onCancelRevoke: () => void;
  onStartRevoke: () => void;
}

export function KeyItem({
  keyData,
  isRevoking,
  isConfirmingRevoke,
  onRevoke,
  onCancelRevoke,
  onStartRevoke,
}: KeyItemProps) {
  const expired = isExpired(keyData.expiresAt);

  return (
    <div
      className={`p-3 rounded-lg border border-transparent ${
        expired
          ? 'bg-destructive-50 dark:bg-destructive-900/20'
          : !keyData.enabled
            ? 'bg-neutral-100 dark:bg-neutral-800/50'
            : 'bg-background dark:bg-neutral-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="font-medium text-secondary-900 dark:text-secondary-100">
              {keyData.name ?? 'Unnamed Key'}
            </h5>

            {/* Status badges */}
            {expired ? (
              <span className="px-2 py-0.5 text-xs font-medium bg-destructive-100 dark:bg-destructive-800 text-destructive-800 dark:text-destructive-200 rounded-full">
                Expired
              </span>
            ) : !keyData.enabled ? (
              <span className="px-2 py-0.5 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full">
                Disabled
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium bg-success/10 dark:bg-success/20 text-success dark:text-success rounded-full">
                Active
              </span>
            )}
          </div>

          <div className="text-xs text-secondary-600 dark:text-secondary-400 space-y-0.5">
            <p>Created: {formatDate(keyData.createdAt)}</p>
            {keyData.expiresAt ? (
              <p>Expires: {formatDate(keyData.expiresAt)}</p>
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
        </div>

        <div className="flex gap-1">
          {isConfirmingRevoke ? (
            <>
              <button
                onClick={onRevoke}
                disabled={isRevoking}
                className="px-2 py-1 text-xs font-medium text-white bg-destructive rounded hover:bg-destructive/90 focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50"
              >
                {isRevoking ? 'Revoking...' : 'Confirm'}
              </button>
              <button
                onClick={onCancelRevoke}
                disabled={isRevoking}
                className="px-2 py-1 text-xs font-medium text-secondary-700 dark:text-secondary-300 bg-background dark:bg-neutral-700 border border-secondary-300 dark:border-secondary-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onStartRevoke}
              disabled={isRevoking}
              className="px-2 py-1 text-xs font-medium text-destructive-700 dark:text-destructive-300 bg-destructive-50 dark:bg-destructive-900/30 border border-destructive-200 dark:border-destructive-800 rounded hover:bg-destructive-100 dark:hover:bg-destructive-900/50 focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50"
            >
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
