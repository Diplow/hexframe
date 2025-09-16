import { useEffect, useState, useRef } from 'react'
import { api } from '~/commons/trpc/react'
import { loggers } from '~/lib/debug/debug-logger'
import type { JobResult } from '~/lib/domains/agentic'
import { Loader2, CheckCircle, XCircle, Clock, Cpu } from 'lucide-react'
import { MarkdownRenderer } from '~/app/map/Chat/Timeline/_components/MarkdownRenderer'
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared'

interface AIResponseWidgetProps {
  jobId?: string
  initialResponse?: string
  model?: string
}

export function AIResponseWidget({ jobId, initialResponse, model }: AIResponseWidgetProps) {
  
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | 'direct'>
    (jobId ? 'pending' : 'direct')
  const [response, setResponse] = useState<string>(initialResponse ?? '')
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const styleInjected = useRef(false)
  

  // Poll for job status if we have a jobId
  // Skip the query entirely if no jobId to avoid errors
  const shouldPoll = !!jobId && status !== 'completed' && status !== 'failed';
  
  // Debug the query input
  const queryInput = { jobId: jobId ?? '' };
  
  const jobStatusQuery = api.agentic.getJobStatus.useQuery(
    queryInput,
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? 2000 : undefined, // Poll every 2 seconds
      refetchIntervalInBackground: shouldPoll,
      retry: 3, // Retry a few times for transient errors
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
      staleTime: 0, // Always consider data stale to ensure polling
      gcTime: 0 // Don't cache failed results
    }
  )
  
  // Handle job status updates
  useEffect(() => {
    if (!jobStatusQuery.data) {
      return
    }
    
    const jobData = jobStatusQuery.data as JobResult
    
    if (jobData.status === 'completed' && jobData.response) {
      setStatus('completed')
      setResponse(jobData.response.content || '')
      loggers.agentic('Job completed', { 
        jobId, 
        model: jobData.response.model,
        usage: jobData.response.usage 
      })
    } else if (jobData.status === 'failed') {
      setStatus('failed')
      setError(jobData.error ?? 'Unknown error occurred')
      loggers.agentic.error('Job failed', { jobId, error: jobData.error })
    } else if (jobData.status === 'processing') {
      setStatus('processing')
    } else {
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
    return (
      <BaseWidget variant="primary" className="w-full">
        <WidgetHeader
          title="HexFrame"
          subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        />
        <WidgetContent>
          <div className="prose dark:prose-invert max-w-none">
            <MarkdownRenderer
              content={response || 'Processing...'}
              isSystemMessage={false}
            />
          </div>
          {model && (
            <div className="text-xs text-muted-foreground">
              Model: {model}
            </div>
          )}
        </WidgetContent>
      </BaseWidget>
    )
  }

  // Pending state (queued) - using muted colors
  if (status === 'pending') {
    return (
      <BaseWidget variant="primary" className="w-full">
        <WidgetHeader
          icon={<Clock className="w-5 h-5 text-muted-foreground animate-pulse" />}
          title="HexFrame"
          subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        />
        <WidgetContent>
          <div className="flex items-center justify-between">
            <div>
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
        </WidgetContent>
      </BaseWidget>
    )
  }

  // Processing state (thinking) - using primary colors
  if (status === 'processing') {
    return (
      <BaseWidget variant="primary" className="w-full">
        <WidgetHeader
          icon={<Cpu className="w-5 h-5 text-primary animate-spin" />}
          title="HexFrame"
          subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        />
        <WidgetContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-primary">
                Processing with AI
              </div>
              <div className="text-sm text-muted-foreground">
                {model ?? 'AI model'} is thinking...
              </div>
              <div className="mt-2">
                <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-progress" />
                </div>
              </div>
            </div>
            <div className="text-sm text-primary">
              {elapsedTime}s
            </div>
          </div>
        </WidgetContent>
      </BaseWidget>
    )
  }

  // Completed state (success) - keeps the message visible
  if (status === 'completed') {
    return (
      <BaseWidget variant="success" className="w-full">
        <WidgetHeader
          icon={<CheckCircle className="w-5 h-5 text-success" />}
          title="HexFrame"
          subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        />
        <WidgetContent>
          <div className="prose dark:prose-invert max-w-none">
            <MarkdownRenderer
              content={response || 'No response content'}
              isSystemMessage={false}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Completed</span>
            {model && <span>Model: {model}</span>}
            {elapsedTime > 0 && <span>Time: {elapsedTime}s</span>}
          </div>
        </WidgetContent>
      </BaseWidget>
    )
  }

  // Failed state (error) - using destructive colors
  if (status === 'failed') {
    return (
      <BaseWidget variant="destructive" className="w-full">
        <WidgetHeader
          icon={<XCircle className="w-5 h-5 text-destructive" />}
          title="HexFrame"
          subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        />
        <WidgetContent>
          <div>
            <div className="font-medium text-destructive">
              Request Failed
            </div>
            <div className="text-sm text-muted-foreground">
              {error ?? 'An error occurred while processing your request'}
            </div>
            {jobId && (
              <div className="text-xs text-muted-foreground mt-1">
                Job ID: {jobId}
              </div>
            )}
          </div>
        </WidgetContent>
      </BaseWidget>
    )
  }

  // Loading initial state
  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        title="HexFrame"
        subtitle={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
      />
      <WidgetContent>
        <span className="text-muted-foreground">Loading...</span>
      </WidgetContent>
    </BaseWidget>
  )
}