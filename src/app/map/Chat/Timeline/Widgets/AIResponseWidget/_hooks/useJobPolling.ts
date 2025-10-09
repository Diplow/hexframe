import { useEffect, useState } from 'react';
import { api } from '~/commons/trpc/react';
import { loggers } from '~/lib/debug/debug-logger';
import type { JobResult } from '~/lib/domains/agentic';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'direct';

export function useJobPolling(jobId?: string, initialResponse?: string) {
  const [status, setStatus] = useState<JobStatus>(jobId ? 'pending' : 'direct');
  const [response, setResponse] = useState<string>(initialResponse ?? '');
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Poll for job status if we have a jobId
  const shouldPoll = !!jobId && status !== 'completed' && status !== 'failed';
  const queryInput = { jobId: jobId ?? '' };

  const jobStatusQuery = api.agentic.getJobStatus.useQuery(queryInput, {
    enabled: shouldPoll,
    refetchInterval: shouldPoll ? 2000 : undefined, // Poll every 2 seconds
    refetchIntervalInBackground: shouldPoll,
    retry: 3, // Retry a few times for transient errors
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    staleTime: 0, // Always consider data stale to ensure polling
    gcTime: 0, // Don't cache failed results
  });

  // Handle job status updates
  useEffect(() => {
    if (!jobStatusQuery.data) {
      return;
    }

    const jobData = jobStatusQuery.data as JobResult;

    if (jobData.status === 'completed' && jobData.response) {
      setStatus('completed');
      setResponse(jobData.response.content || '');
      loggers.agentic('Job completed', {
        jobId,
        model: jobData.response.model,
        usage: jobData.response.usage,
      });
    } else if (jobData.status === 'failed') {
      setStatus('failed');
      setError(jobData.error ?? 'Unknown error occurred');
      loggers.agentic.error('Job failed', { jobId, error: jobData.error });
    } else if (jobData.status === 'processing') {
      setStatus('processing');
    }
  }, [jobStatusQuery.data, jobId]);

  // Handle query errors - but don't immediately fail for transient errors
  useEffect(() => {
    if (jobStatusQuery.error) {
      const errorMessage = jobStatusQuery.error.message || 'Unknown error';
      loggers.agentic.error('Error fetching job status', {
        jobId,
        error: errorMessage,
        status,
      });

      // Only set to failed if we've been trying for a while (more than 10 seconds)
      if (elapsedTime > 10) {
        setError(`Failed to fetch job status: ${errorMessage}`);
        setStatus('failed');
      }
    }
  }, [jobStatusQuery.error, jobId, elapsedTime, status]);

  // Track elapsed time for pending/processing jobs
  useEffect(() => {
    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  return {
    status,
    response,
    error,
    elapsedTime,
  };
}
