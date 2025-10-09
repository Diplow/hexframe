import { useState } from 'react';

export function useKeyActions() {
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleRevoke = async (keyId: string, onRevoke: (keyId: string) => Promise<void>) => {
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

  return {
    revokingKeyId,
    confirmRevokeId,
    setConfirmRevokeId,
    copyFeedback,
    handleRevoke,
    handleCopy,
  };
}
