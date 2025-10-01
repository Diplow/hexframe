'use client';

import { useState, useRef, useEffect } from 'react';
import { WandSparkles, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { api } from '~/commons/trpc/react';

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
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = (jobId: string) => {
    setQueuedJobId(jobId);

    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      void checkJobStatus().then((result) => {
        if (result.data) {
          const { status, response } = result.data;

          if (status === 'completed' && response) {
            // Extract preview from response
            const previewData = response as { preview?: string; usedAI?: boolean };
            if (previewData.preview) {
              onPreviewChange(previewData.preview);
            }
            setIsGeneratingPreview(false);
            setQueuedJobId(null);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
          } else if (status === 'failed' || status === 'cancelled') {
            console.error('Preview generation failed:', result.data.error);
            setIsGeneratingPreview(false);
            setQueuedJobId(null);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
          }
        }
      });
    }, 2000);
  };

  const generatePreviewMutation = api.agentic.generatePreview.useMutation({
    onSuccess: (data: { preview: string; usedAI: boolean; jobId?: string; queued?: boolean }) => {
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
    },
    onError: (error: unknown) => {
      console.error('Failed to generate preview:', error);
      setIsGeneratingPreview(false);
    }
  });

  const handleGeneratePreview = () => {
    if (!content.trim()) return;

    setIsGeneratingPreview(true);
    generatePreviewMutation.mutate({ title, content });
  };

  const handlePreviewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to content field
      const contentTextarea = document.querySelector<HTMLTextAreaElement>('[data-field="content"]');
      contentTextarea?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="p-3 space-y-3">

      {/* Preview Field */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-muted-foreground">
            Preview
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!content.trim() || isGeneratingPreview}
            onClick={handleGeneratePreview}
            title={content.trim() ? "Generate preview with AI" : "Add content first"}
          >
            {isGeneratingPreview ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
        <textarea
          value={preview}
          onChange={(e) => onPreviewChange(e.target.value)}
          onKeyDown={handlePreviewKeyDown}
          className="w-full min-h-[60px] p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Enter preview for AI context (helps AI decide whether to load full content)"
          data-field="preview"
        />
      </div>

      {/* Content Field */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Content
        </label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleContentKeyDown}
          className="w-full min-h-[100px] p-2 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Enter content (optional)"
          data-field="content"
        />
      </div>
    </div>
  );
}
