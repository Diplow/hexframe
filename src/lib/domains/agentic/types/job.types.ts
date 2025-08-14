// Types for queued job responses

export interface JobResult {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout'
  response?: {
    id: string
    content: string
    model: string
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    finishReason?: 'error' | 'length' | 'stop' | 'content_filter'
  }
  error?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface QueuedJobResponse {
  id: string
  content: string
  model: string
  status: 'pending'
  jobId: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: 'queued'
}