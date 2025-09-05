'use client';

import { useState } from 'react';
import { KeyList } from './KeyList';
import { KeyCreation } from './KeyCreation';
import { useMcpKeys, type CreateKeyResult } from './useMcpKeys';

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
    <div className="w-full">
      <div className="bg-neutral-50 dark:bg-neutral-800/30 rounded-lg p-4 border-transparent relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            MCP API Keys
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>


        {/* Content */}
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

      </div>
    </div>
  );
}