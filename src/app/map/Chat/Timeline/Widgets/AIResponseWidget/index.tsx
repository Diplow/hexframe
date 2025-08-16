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
      retry: 3, // Retry a few times for transient errors
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
      staleTime: 0, // Always consider data stale to ensure polling
      gcTime: 0 // Don't cache failed results
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
  
  // Handle query errors - but don't immediately fail for transient errors
  useEffect(() => {
    if (jobStatusQuery.error) {
      const errorMessage = jobStatusQuery.error.message || 'Unknown error';
      loggers.agentic.error('Error fetching job status', { 
        jobId, 
        error: errorMessage,
        status
      })
      
      // Only set to failed if we've been trying for a while (more than 10 seconds)
      // This gives time for the job to be created on the server
      if (elapsedTime > 10) {
        setError(`Failed to fetch job status: ${errorMessage}`)
        setStatus('failed')
      }
      // Otherwise, keep trying - the job might not be ready yet
    }
  }, [jobStatusQuery.error, jobId, elapsedTime, status])

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
      <div className="w-full p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium">
              <span className="font-bold text-primary">HexFrame</span>
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <MarkdownRenderer 
              content={response || 'Processing...'} 
              isSystemMessage={false}
            />
          </div>
          {model && (
            <div className="mt-2 text-xs text-muted-foreground">
              Model: {model}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Pending state (queued) - using muted colors
  if (status === 'pending') {
    console.log('[AIResponseWidget] Rendering PENDING state')
    return (
      <div className="w-full p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium">
              <span className="font-bold text-primary">HexFrame</span>
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
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
      </div>
    )
  }

  // Processing state (thinking) - using primary colors
  if (status === 'processing') {
    console.log('[AIResponseWidget] Rendering PROCESSING state')
    return (
      <div className="w-full p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium">
              <span className="font-bold text-primary">HexFrame</span>
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
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
      </div>
    )
  }

  // Completed state (success) - keeps the message visible
  if (status === 'completed') {
    console.log('[AIResponseWidget] Rendering COMPLETED state with response:', response?.substring(0, 100))
    return (
      <div className="w-full p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium">
              <span className="font-bold text-primary">HexFrame</span>
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
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
      </div>
    )
  }

  // Failed state (error) - using destructive colors
  if (status === 'failed') {
    console.log('[AIResponseWidget] Rendering FAILED state with error:', error)
    return (
      <div className="w-full p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium">
              <span className="font-bold text-primary">HexFrame</span>
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
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
      </div>
    )
  }

  // Loading initial state
  console.log('[AIResponseWidget] Rendering LOADING state (fallback)')
  return (
    <div className="w-full p-4 rounded-lg bg-muted/30">
      <div className="text-sm">
        <div className="flex items-center gap-1 mb-1">
          <span className="font-medium">
            <span className="font-bold text-primary-light">HexFrame</span>
          </span>
          <span className="text-muted-foreground">-</span>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    </div>
  )
}