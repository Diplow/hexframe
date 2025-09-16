'use client';

import { useState } from 'react';
import { Key } from 'lucide-react';
import { KeyList } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/KeyList';
import { KeyCreation } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/KeyCreation';
import { useMcpKeys, type CreateKeyResult } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/useMcpKeys';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface McpKeysWidgetProps {
  onClose?: () => void;
}

export function McpKeysWidget({ onClose }: McpKeysWidgetProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<CreateKeyResult | null>(null);
  const {
    keys,
    isLoading,
    createKey,
    revokeKey,
    refreshKeys
  } = useMcpKeys();

  const handleCreateSuccess = (newKey: CreateKeyResult) => {
    setNewlyCreatedKey(newKey);
    setView('list');
    void refreshKeys();
  };

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<Key className="h-5 w-5 text-primary" />}
        title="MCP API Keys"
        onClose={onClose}
      />

      <WidgetContent>
        {view === 'list' && (
          <KeyList
            keys={keys}
            isLoading={isLoading}
            onRevoke={revokeKey}
            onRefresh={refreshKeys}
            newlyCreatedKey={newlyCreatedKey}
            onDismissNewKey={() => setNewlyCreatedKey(null)}
            onCreateKey={() => setView('create')}
          />
        )}

        {view === 'create' && (
          <KeyCreation
            onSuccess={handleCreateSuccess}
            onCancel={() => setView('list')}
            onCreate={createKey}
          />
        )}
      </WidgetContent>
    </BaseWidget>
  );
}