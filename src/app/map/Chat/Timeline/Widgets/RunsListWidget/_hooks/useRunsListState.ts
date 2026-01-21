'use client';

import { useState, useCallback, useMemo } from 'react';
import { api } from '~/commons/trpc/react';
import type { RunStatus } from '~/lib/domains/agentic/services/_run-services/_run.types';

export type StatusFilter = 'active' | 'closed' | 'all';

export interface RunListItem {
  id: string;
  rootCoords: string;
  title: string;
  status: RunStatus;
  blockageReason: string | null;
  stepsCompleted: number;
  totalSteps: number;
  createdAt: Date;
  updatedAt: Date;
}

export function useRunsListState() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const statusFilterToApi = useMemo((): RunStatus[] => {
    switch (statusFilter) {
      case 'active':
        return ['open', 'blocked'];
      case 'closed':
        return ['closed'];
      case 'all':
        return ['open', 'blocked', 'closed'];
    }
  }, [statusFilter]);

  const runsQuery = api.agentic.listRuns.useQuery(
    { statusFilter: statusFilterToApi, limit: 50 },
    { refetchInterval: 5000 }
  );

  const closeRunMutation = api.agentic.closeRun.useMutation({
    onSuccess: () => {
      void runsQuery.refetch();
    },
  });

  const reopenRunMutation = api.agentic.reopenRun.useMutation({
    onSuccess: () => {
      void runsQuery.refetch();
    },
  });

  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data]);
  const isLoading = runsQuery.isLoading;
  const error = runsQuery.error?.message;

  const handleRefresh = useCallback(() => {
    void runsQuery.refetch();
  }, [runsQuery]);

  const handleCloseRun = useCallback((runId: string) => {
    closeRunMutation.mutate({ runId });
  }, [closeRunMutation]);

  const handleReopenRun = useCallback((runId: string) => {
    reopenRunMutation.mutate({ runId });
  }, [reopenRunMutation]);

  return {
    runs,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    handleRefresh,
    handleCloseRun,
    handleReopenRun,
  };
}
