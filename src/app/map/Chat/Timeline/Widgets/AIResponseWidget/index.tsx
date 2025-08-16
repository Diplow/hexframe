import { useEffect, useState, useRef } from 'react'
import { api } from '~/commons/trpc/react'
import { loggers } from '~/lib/debug/debug-logger'
import type { JobResult } from '~/lib/domains/agentic/interface'
import { Loader2, CheckCircle, XCircle, Clock, Cpu } from 'lucide-react'
import { MarkdownRenderer } from '../../MarkdownRenderer'
import { cn } from '~/lib/utils'

interface AIResponseWidgetProps {
  jobId?: string
  initialResponse?: string
  model?: string
}

export function AIResponseWidget({ jobId, initialResponse, model }: AIResponseWidgetProps) {
  console.log('[AIResponseWidget] Component mounted with props:', {
    jobId,
    hasInitialResponse: !!initialResponse,
    model
  })
  
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | 'direct'>
    (jobId ? 'pending' : 'direct')
  const [response, setResponse] = useState<string>(initialResponse ?? '')
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const styleInjected = useRef(false)
  
  console.log('[AIResponseWidget] Initial status:', status)

  // Poll for job status if we have a jobId
  // Skip the query entirely if no jobId to avoid errors
  const shouldPoll = !!jobId && status !== 'completed' && status !== 'failed';
  
  // Debug the query input
  const queryInput = { jobId: jobId ?? '' };
  console.log('[AIResponseWidget] Query input:', queryInput, 'shouldPoll:', shouldPoll);
  
  const jobStatusQuery = api.agentic.getJobStatus.useQuery(
    queryInput,
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? 2000 : undefined, // Poll every 2 seconds
      refetchIntervalInBackground: shouldPoll,
      retry: false, // Don't retry on error
      staleTime: 0 // Always consider data stale to ensure polling
    }
  )
  
  // Handle job status updates
  useEffect(() => {
    if (!jobStatusQuery.data) {
      console.log('[AIResponseWidget] No job status data yet')
      return
    }
    
    const jobData = jobStatusQuery.data as JobResult
    console.log('[AIResponseWidget] Job status update:', jobData)
    
    if (jobData.status === 'completed' && jobData.response) {
      console.log('[AIResponseWidget] Job COMPLETED, setting response')
      setStatus('completed')
      setResponse(jobData.response.content || '')
      loggers.agentic('Job completed', { 
        jobId, 
        model: jobData.response.model,
        usage: jobData.response.usage 
      })
    } else if (jobData.status === 'failed') {
      console.log('[AIResponseWidget] Job FAILED:', jobData.error)
      setStatus('failed')
      setError(jobData.error ?? 'Unknown error occurred')
      loggers.agentic.error('Job failed', { jobId, error: jobData.error })
    } else if (jobData.status === 'processing') {
      console.log('[AIResponseWidget] Job PROCESSING')
      setStatus('processing')
    } else {
      console.log('[AIResponseWidget] Job status unknown:', jobData.status)
    }
  }, [jobStatusQuery.data, jobId])
  
  // Handle query errors
  useEffect(() => {
    if (jobStatusQuery.error) {
      loggers.agentic.error('Failed to fetch job status', { 
        jobId, 
        error: jobStatusQuery.error.message 
      })
      setError('Failed to fetch job status')
      setStatus('failed')
    }
  }, [jobStatusQuery.error, jobId])

  // Track elapsed time for pending/processing jobs
  useEffect(() => {
    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status])

  // Inject animation styles once on client side
  useEffect(() => {
    if (!styleInjected.current && typeof document !== 'undefined') {
      const style = document.createElement('style')
      style.textContent = `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `
      document.head.appendChild(style)
      styleInjected.current = true
      
      // Cleanup on unmount
      return () => {
        if (style.parentNode) {
          style.parentNode.removeChild(style)
        }
      }
    }
  }, [])

  // Direct response (no job)
  if (status === 'direct') {
    console.log('[AIResponseWidget] Rendering DIRECT response, content:', response)
    return (
      <div className="ai-response-widget">
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer 
            content={response || 'Processing...'} 
            isSystemMessage={false}
          />
        </div>
        {model && (
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Model: {model}
          </div>
        )}
      </div>
    )
  }

  // Pending state (queued) - using muted colors
  if (status === 'pending') {
    console.log('[AIResponseWidget] Rendering PENDING state')
    return (
      <div className={cn(
        "ai-response-widget p-4 rounded-lg transition-all duration-300 ease-in-out",
        "bg-muted/30 border border-muted"
      )}>
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />
          <div className="flex-1">
            <div className="font-medium text-foreground">
              Request Queued
            </div>
            <div className="text-sm text-muted-foreground">
              Your request has been queued and will be processed shortly...
            </div>
            {jobId && (
              <div className="text-xs text-muted-foreground mt-1">
                Job ID: {jobId}
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {elapsedTime}s
          </div>
        </div>
      </div>
    )
  }

  // Processing state (thinking) - using primary colors
  if (status === 'processing') {
    console.log('[AIResponseWidget] Rendering PROCESSING state')
    return (
      <div className={cn(
        "ai-response-widget p-4 rounded-lg transition-all duration-300 ease-in-out",
        "bg-primary/10 border border-primary/30 dark:bg-primary/20 dark:border-primary/40"
      )}>
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-primary dark:text-primary-light animate-spin" />
          <div className="flex-1">
            <div className="font-medium text-primary-dark dark:text-primary-light">
              Processing with AI
            </div>
            <div className="text-sm text-primary dark:text-primary-light/80">
              {model ?? 'AI model'} is thinking...
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-primary/20 dark:bg-primary/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary dark:bg-primary-light animate-progress" />
              </div>
            </div>
          </div>
          <div className="text-sm text-primary dark:text-primary-light">
            {elapsedTime}s
          </div>
        </div>
      </div>
    )
  }

  // Completed state (success) - starts with success colors but fades to neutral
  if (status === 'completed') {
    console.log('[AIResponseWidget] Rendering COMPLETED state with response:', response?.substring(0, 100))
    return (
      <div className={cn(
        "ai-response-widget p-4 rounded-lg",
        "transition-all duration-[3000ms] ease-in-out",
        "bg-success/5 border border-success/20",
        "hover:bg-background hover:border-border"
      )}>
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer 
            content={response || 'No response content'} 
            isSystemMessage={false}
          />
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-success" />
            <span>Completed</span>
          </div>
          {model && <span>Model: {model}</span>}
          {elapsedTime > 0 && <span>Time: {elapsedTime}s</span>}
        </div>
      </div>
    )
  }

  // Failed state (error) - using destructive colors
  if (status === 'failed') {
    console.log('[AIResponseWidget] Rendering FAILED state with error:', error)
    return (
      <div className={cn(
        "ai-response-widget p-4 rounded-lg transition-all duration-300 ease-in-out",
        "bg-destructive/10 border border-destructive/30 dark:bg-destructive/20 dark:border-destructive/40"
      )}>
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive dark:text-destructive-light" />
          <div className="flex-1">
            <div className="font-medium text-destructive-dark dark:text-destructive-light">
              Request Failed
            </div>
            <div className="text-sm text-destructive dark:text-destructive-light/80">
              {error ?? 'An error occurred while processing your request'}
            </div>
            {jobId && (
              <div className="text-xs text-destructive dark:text-destructive-light mt-1">
                Job ID: {jobId}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Loading initial state
  console.log('[AIResponseWidget] Rendering LOADING state (fallback)')
  return (
    <div className="ai-response-widget p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-600 dark:text-neutral-400" />
        <span className="text-neutral-700 dark:text-neutral-300">Loading...</span>
      </div>
    </div>
  )
}