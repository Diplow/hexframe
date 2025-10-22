interface RevokeButtonsProps {
  isRevoking: boolean;
  isConfirmingRevoke: boolean;
  onRevoke: () => void;
  onCancelRevoke: () => void;
  onStartRevoke: () => void;
}

export function RevokeButtons({
  isRevoking,
  isConfirmingRevoke,
  onRevoke,
  onCancelRevoke,
  onStartRevoke,
}: RevokeButtonsProps) {
  if (isConfirmingRevoke) {
    return (
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
    );
  }

  return (
    <button
      onClick={onStartRevoke}
      disabled={isRevoking}
      className="px-2 py-1 text-xs font-medium text-destructive-700 dark:text-destructive-300 bg-destructive-50 dark:bg-destructive-900/30 border border-destructive-200 dark:border-destructive-800 rounded hover:bg-destructive-100 dark:hover:bg-destructive-900/50 focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50"
    >
      Revoke
    </button>
  );
}
