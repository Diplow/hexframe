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
  const jobStatusQuery = api.agentic.getJobStatus.useQuery(
    { jobId: jobId ?? '' },
    {
      enabled: !!jobId && status !== 'completed' && status !== 'failed',
      refetchInterval: 2000, // Poll every 2 seconds
      refetchIntervalInBackground: true
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

  // Pending state
  if (status === 'pending') {
    console.log('[AIResponseWidget] Rendering PENDING state')
    return (
      <div className={cn(
        "ai-response-widget p-4 rounded-lg transition-all duration-300 ease-in-out",
        "bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
      )}>
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-pulse" />
          <div className="flex-1">
            <div className="font-medium text-yellow-800 dark:text-yellow-300">
              Request Queued
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-400/80">
              Your request has been queued and will be processed shortly...
            </div>
            {jobId && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Job ID: {jobId}
              </div>
            )}
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            {elapsedTime}s
          </div>
        </div>
      </div>
    )
  }

  // Processing state
  if (status === 'processing') {
    console.log('[AIResponseWidget] Rendering PROCESSING state')
    return (
      <div className={cn(
        "ai-response-widget p-4 rounded-lg transition-all duration-300 ease-in-out",
        "bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
      )}>
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-spin" />
          <div className="flex-1">
            <div className="font-medium text-orange-800 dark:text-orange-300">
              Processing with AI
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-400/80">
              {model ?? 'AI model'} is thinking...
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-orange-200 dark:bg-orange-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 dark:bg-orange-400 animate-progress" />
              </div>
            </div>
          </div>
          <div className="text-sm text-orange-600 dark:text-orange-400">
            {elapsedTime}s
          </div>
        </div>
      </div>
    )
  }

  // Completed state
  if (status === 'completed') {
    console.log('[AIResponseWidget] Rendering COMPLETED state with response:', response?.substring(0, 100))
    return (
      <div className={cn(
        "ai-response-widget p-4 rounded-lg transition-all duration-300 ease-in-out",
        "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800"
      )}>
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer 
            content={response || 'No response content'} 
            isSystemMessage={false}
          />
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-green-600 dark:text-green-400">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
            <span>Completed</span>
          </div>
          {model && <span>Model: {model}</span>}
          {elapsedTime > 0 && <span>Time: {elapsedTime}s</span>}
        </div>
      </div>
    )
  }

  // Failed state
  if (status === 'failed') {
    console.log('[AIResponseWidget] Rendering FAILED state with error:', error)
    return (
      <div className={cn(
        "ai-response-widget p-4 rounded-lg transition-all duration-300 ease-in-out",
        "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"
      )}>
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <div className="font-medium text-red-800 dark:text-red-300">
              Request Failed
            </div>
            <div className="text-sm text-red-700 dark:text-red-400/80">
              {error ?? 'An error occurred while processing your request'}
            </div>
            {jobId && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
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