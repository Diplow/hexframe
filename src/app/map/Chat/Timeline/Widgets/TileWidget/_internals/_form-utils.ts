export function _handlePreviewKeyDown(
  e: React.KeyboardEvent,
  onCancel: () => void
) {
  if (e.key === 'Enter') {
    e.preventDefault();
    // Move to content field
    const contentTextarea = document.querySelector<HTMLTextAreaElement>('[data-field="content"]');
    contentTextarea?.focus();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
  }
}

export function _handleContentKeyDown(
  e: React.KeyboardEvent,
  onSave: () => void,
  onCancel: () => void
) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    onSave();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
  }
}

export function _startPolling(
  jobId: string,
  setQueuedJobId: (id: string) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkJobStatus: () => Promise<any>,
  onPreviewChange: (preview: string) => void,
  setIsGeneratingPreview: (value: boolean) => void,
  pollIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>
) {
  setQueuedJobId(jobId);

  // Poll every 2 seconds
  pollIntervalRef.current = setInterval(() => {
    void checkJobStatus().then((result) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (result.data) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const { status, response } = result.data;

        if (status === 'completed' && response) {
          // Extract preview from response
          const previewData = response as { preview?: string; usedAI?: boolean };
          if (previewData.preview) {
            onPreviewChange(previewData.preview);
          }
          setIsGeneratingPreview(false);
          setQueuedJobId('');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        } else if (status === 'failed' || status === 'cancelled') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          console.error('Preview generation failed:', result.data.error);
          setIsGeneratingPreview(false);
          setQueuedJobId('');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      }
    });
  }, 2000);
}

export function _handleGenerateSuccess(
  data: { preview: string; usedAI: boolean; jobId?: string; queued?: boolean },
  onPreviewChange: (preview: string) => void,
  setIsGeneratingPreview: (value: boolean) => void,
  startPolling: (jobId: string) => void
) {
  if (data.queued && data.jobId) {
    // Job was queued - start polling
    startPolling(data.jobId);
  } else if (data.preview) {
    // Immediate response - fill preview
    onPreviewChange(data.preview);
    setIsGeneratingPreview(false);
  } else {
    setIsGeneratingPreview(false);
  }
}

export function _handleGenerateError(
  error: unknown,
  setIsGeneratingPreview: (value: boolean) => void
) {
  console.error('Failed to generate preview:', error);
  setIsGeneratingPreview(false);
}
