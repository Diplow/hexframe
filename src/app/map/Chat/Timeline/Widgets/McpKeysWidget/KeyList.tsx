import type { McpKey, CreateKeyResult } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/useMcpKeys';
import { useKeyActions } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_hooks/useKeyActions';
import { LoadingState } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/key-list/LoadingState';
import { EmptyState } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/key-list/EmptyState';
import { KeyListHeader } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/key-list/KeyListHeader';
import { NewKeyAlert } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/key-list/NewKeyAlert';
import { KeyItem } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/_components/key-list/KeyItem';

interface KeyListProps {
  keys: McpKey[];
  isLoading: boolean;
  onRevoke: (keyId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  newlyCreatedKey: CreateKeyResult | null;
  onDismissNewKey: () => void;
  onCreateKey: () => void;
}

export function KeyList({
  keys,
  isLoading,
  onRevoke,
  onRefresh,
  newlyCreatedKey,
  onDismissNewKey,
  onCreateKey,
}: KeyListProps) {
  const { revokingKeyId, confirmRevokeId, setConfirmRevokeId, copyFeedback, handleRevoke, handleCopy } =
    useKeyActions();

  if (isLoading && keys.length === 0) {
    return <LoadingState />;
  }

  if (keys.length === 0) {
    return <EmptyState onCreateKey={onCreateKey} />;
  }

  return (
    <div className="space-y-4">
      <KeyListHeader keyCount={keys.length} isLoading={isLoading} onCreateKey={onCreateKey} onRefresh={onRefresh} />

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <NewKeyAlert
          newlyCreatedKey={newlyCreatedKey}
          copyFeedback={copyFeedback}
          onCopy={handleCopy}
          onDismiss={onDismissNewKey}
        />
      )}

      <div className="space-y-2">
        {keys.map((key) => (
          <KeyItem
            key={key.id}
            keyData={key}
            isRevoking={revokingKeyId === key.id}
            isConfirmingRevoke={confirmRevokeId === key.id}
            onRevoke={() => void handleRevoke(key.id, onRevoke)}
            onCancelRevoke={() => setConfirmRevokeId(null)}
            onStartRevoke={() => setConfirmRevokeId(key.id)}
          />
        ))}
      </div>
    </div>
  );
}
