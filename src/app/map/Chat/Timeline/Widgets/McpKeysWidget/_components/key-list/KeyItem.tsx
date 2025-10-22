import type { McpKey } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/useMcpKeys';
import { isExpired } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_helpers/key-utils';
import { StatusBadge } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/_internal/StatusBadge';
import { KeyDates } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/_internal/KeyDates';
import { RevokeButtons } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/_internal/RevokeButtons';

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
            <StatusBadge expired={expired} enabled={keyData.enabled} />
          </div>

          <KeyDates createdAt={keyData.createdAt} expiresAt={keyData.expiresAt} />
        </div>

        <div className="flex gap-1">
          <RevokeButtons
            isRevoking={isRevoking}
            isConfirmingRevoke={isConfirmingRevoke}
            onRevoke={onRevoke}
            onCancelRevoke={onCancelRevoke}
            onStartRevoke={onStartRevoke}
          />
        </div>
      </div>
    </div>
  );
}
