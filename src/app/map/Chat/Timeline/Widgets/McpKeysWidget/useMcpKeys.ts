import { useState, useEffect, useCallback } from 'react';
import { api } from '~/commons/trpc/react';

export interface McpKey {
  id: string;
  name: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  enabled: boolean;
}

export interface CreateKeyData {
  name: string;
  password: string;
  expiresAt?: Date;
}

export interface CreateKeyResult {
  keyId: string;
  key: string;
  name: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export function useMcpKeys() {
  const [keys, setKeys] = useState<McpKey[]>([]);
  const [error, setError] = useState<string | null>(null);

  const listKeysQuery = api.mcp.listKeys.useQuery(undefined);

  const createKeyMutation = api.mcp.createKey.useMutation({
    onSuccess: () => {
      setError(null);
      void listKeysQuery.refetch();
    }
  });

  const revokeKeyMutation = api.mcp.revokeKey.useMutation({
    onSuccess: () => {
      setError(null);
      void listKeysQuery.refetch();
    }
  });

  useEffect(() => {
    if (listKeysQuery.data) {
      setKeys(listKeysQuery.data);
    }
    if (listKeysQuery.error) {
      setError(listKeysQuery.error.message);
    } else {
      setError(null);
    }
  }, [listKeysQuery.data, listKeysQuery.error]);

  const createKey = useCallback(async (data: CreateKeyData): Promise<CreateKeyResult> => {
    try {
      const result = await createKeyMutation.mutateAsync(data);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create key';
      setError(message);
      throw new Error(message);
    }
  }, [createKeyMutation]);

  const revokeKey = useCallback(async (keyId: string): Promise<void> => {
    try {
      await revokeKeyMutation.mutateAsync({ keyId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke key';
      setError(message);
      throw new Error(message);
    }
  }, [revokeKeyMutation]);

  const refreshKeys = useCallback(async () => {
    await listKeysQuery.refetch();
  }, [listKeysQuery]);

  return {
    keys,
    isLoading: listKeysQuery.isLoading || createKeyMutation.isPending || revokeKeyMutation.isPending,
    error,
    createKey,
    revokeKey,
    refreshKeys,
    isCreating: createKeyMutation.isPending,
    isRevoking: revokeKeyMutation.isPending
  };
}