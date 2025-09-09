import { useState } from 'react';
import type { McpKey, CreateKeyResult } from '~/app/map/Chat/Timeline/Widgets/McpKeysWidget/useMcpKeys';

interface KeyListProps {
  keys: McpKey[];
  isLoading: boolean;
  onRevoke: (keyId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  newlyCreatedKey: CreateKeyResult | null;
  onDismissNewKey: () => void;
  onCreateKey: () => void;
}

export function KeyList({ keys, isLoading, onRevoke, onRefresh, newlyCreatedKey, onDismissNewKey, onCreateKey }: KeyListProps) {
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleRevoke = async (keyId: string) => {
    setRevokingKeyId(keyId);
    try {
      await onRevoke(keyId);
      setConfirmRevokeId(null);
    } catch (error) {
      console.error('Failed to revoke key:', error);
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const isExpired = (expiresAt: Date | null) => {
    return expiresAt && expiresAt < new Date();
  };

  if (isLoading && keys.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m12 6 0 6 6 0-6-6z"></path>
          </svg>
          <span>Loading API keys...</span>
        </div>
      </div>
    );
  }

  if (keys.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-secondary-500 dark:text-secondary-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
          </svg>
          <p>No API keys found</p>
        </div>
        <p className="text-sm text-secondary-600 dark:text-secondary-400">
          <button
            onClick={onCreateKey}
            className="text-primary hover:text-primary/80 underline font-medium"
          >
            Create your first API key
          </button>{" "}
          to enable MCP access with Claude Code.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
          Active Keys ({keys.length})
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateKey}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50"
            disabled={isLoading}
          >
            Create Key
          </button>
          <button
            onClick={() => void onRefresh()}
            className="p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
            disabled={isLoading}
            aria-label="Refresh keys"
          >
            <svg 
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <div className="p-4 bg-success/30 border border-transparent rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h5 className="font-semibold text-success-800 dark:text-success-200">
                API Key Created: {newlyCreatedKey.name}
              </h5>
            </div>
            <button
              onClick={onDismissNewKey}
              className="p-1 text-success-400 hover:text-success-600 dark:hover:text-success-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-success-700 dark:text-success-300">
              <strong>Copy your secret key now - it won&apos;t be shown again!</strong>
            </p>
            
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded border select-all font-mono">
                {newlyCreatedKey.key}
              </code>
              <button
                onClick={() => void handleCopy(newlyCreatedKey.key)}
                className={`p-2 border rounded transition-colors ${
                  copyFeedback 
                    ? 'text-success-600 dark:text-success-400 bg-success/10 dark:bg-success/20 border-success/30 dark:border-success/30' 
                    : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                }`}
                aria-label={copyFeedback ? "Copied to clipboard" : "Copy to clipboard"}
              >
                {copyFeedback ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {keys.map((key) => (
          <div 
            key={key.id} 
            className={`p-3 rounded-lg border border-transparent ${
              isExpired(key.expiresAt) 
                ? 'bg-destructive-50 dark:bg-destructive-900/20'
                : !key.enabled
                ? 'bg-neutral-100 dark:bg-neutral-800/50'
                : 'bg-background dark:bg-neutral-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-medium text-secondary-900 dark:text-secondary-100">
                    {key.name ?? 'Unnamed Key'}
                  </h5>
                  
                  {/* Status badges */}
                  {isExpired(key.expiresAt) ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-destructive-100 dark:bg-destructive-800 text-destructive-800 dark:text-destructive-200 rounded-full">
                      Expired
                    </span>
                  ) : !key.enabled ? (
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
                  <p>Created: {formatDate(key.createdAt)}</p>
                  {key.expiresAt ? (
                    <p>Expires: {formatDate(key.expiresAt)}</p>
                  ) : (
                    <p className="flex items-center gap-1">
                      Expires: none
                      <svg className="w-3 h-3 text-warning dark:text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-1">
                {confirmRevokeId === key.id ? (
                  <>
                    <button
                      onClick={() => void handleRevoke(key.id)}
                      disabled={revokingKeyId === key.id}
                      className="px-2 py-1 text-xs font-medium text-white bg-destructive rounded hover:bg-destructive/90 focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50"
                    >
                      {revokingKeyId === key.id ? 'Revoking...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmRevokeId(null)}
                      disabled={revokingKeyId === key.id}
                      className="px-2 py-1 text-xs font-medium text-secondary-700 dark:text-secondary-300 bg-background dark:bg-neutral-700 border border-secondary-300 dark:border-secondary-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-600 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmRevokeId(key.id)}
                    disabled={revokingKeyId !== null}
                    className="px-2 py-1 text-xs font-medium text-destructive-700 dark:text-destructive-300 bg-destructive-50 dark:bg-destructive-900/30 border border-destructive-200 dark:border-destructive-800 rounded hover:bg-destructive-100 dark:hover:bg-destructive-900/50 focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}