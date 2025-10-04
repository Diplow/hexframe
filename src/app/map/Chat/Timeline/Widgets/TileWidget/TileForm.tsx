'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '~/commons/trpc/react';
import {
  _handlePreviewKeyDown,
  _handleContentKeyDown,
  _startPolling,
  _handleGenerateSuccess,
  _handleGenerateError,
} from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/_form-utils';
import { _PreviewField } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_PreviewField';
import { _ContentField } from '~/app/map/Chat/Timeline/Widgets/TileWidget/_internals/form/_ContentField';

interface TileFormProps {
  mode: 'create' | 'edit';
  title: string;
  preview: string;
  content: string;
  onPreviewChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TileForm({
  mode: _mode,
  title,
  preview,
  content,
  onPreviewChange,
  onContentChange,
  onSave,
  onCancel,
}: TileFormProps) {
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [queuedJobId, setQueuedJobId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll job status for queued jobs
  const { refetch: checkJobStatus } = api.agentic.getJobStatus.useQuery(
    { jobId: queuedJobId! },
    { enabled: false }
  );

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = (jobId: string) => {
    _startPolling(
      jobId,
      setQueuedJobId,
      checkJobStatus,
      onPreviewChange,
      setIsGeneratingPreview,
      pollIntervalRef
    );
  };

  const generatePreviewMutation = api.agentic.generatePreview.useMutation({
    onSuccess: (data: { preview: string; usedAI: boolean; jobId?: string; queued?: boolean }) => {
      _handleGenerateSuccess(data, onPreviewChange, setIsGeneratingPreview, startPolling);
    },
    onError: (error: unknown) => {
      _handleGenerateError(error, setIsGeneratingPreview);
    }
  });

  const handleGeneratePreview = () => {
    if (!content.trim()) return;
    setIsGeneratingPreview(true);
    generatePreviewMutation.mutate({ title, content });
  };

  return (
    <div className="p-3 space-y-3">
      <_PreviewField
        value={preview}
        isGenerating={isGeneratingPreview}
        hasContent={!!content.trim()}
        onChange={onPreviewChange}
        onKeyDown={(e) => _handlePreviewKeyDown(e, onCancel)}
        onGenerate={handleGeneratePreview}
      />

      <_ContentField
        value={content}
        onChange={onContentChange}
        onKeyDown={(e) => _handleContentKeyDown(e, onSave, onCancel)}
      />
    </div>
  );
}
