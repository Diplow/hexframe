import { FormButton } from '~/app/components';

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
        <FormButton
          variant="destructive"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          isLoading={isRevoking}
        >
          {isRevoking ? 'Revoking...' : 'Confirm'}
        </FormButton>
        <FormButton
          variant="secondary"
          size="sm"
          onClick={onCancelRevoke}
          disabled={isRevoking}
        >
          Cancel
        </FormButton>
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
