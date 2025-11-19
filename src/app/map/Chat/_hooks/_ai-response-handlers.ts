import type { useChatOperations } from '~/app/map/Chat/_state';
import { loggers } from '~/lib/debug/debug-logger';

// Type for the tRPC response that might include jobId for queued responses
export interface GenerateResponseResult {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error' | 'queued';
  jobId?: string; // Present when finishReason is 'queued'
}

export function _handleSuccessResponse(
  response: GenerateResponseResult,
  chatState: ReturnType<typeof useChatOperations>,
  setIsGenerating: (value: boolean) => void
) {
  // Check if response is queued based on finishReason
  if (response.finishReason === 'queued' && response.jobId) {
    // Send AI Response widget for queued job
    chatState.showAIResponseWidget({
      jobId: response.jobId,
      model: response.model
    });
    loggers.agentic('Request queued, widget sent', { jobId: response.jobId });
  } else {
    // Send AI Response widget for direct response
    chatState.showAIResponseWidget({
      initialResponse: response.content,
      model: response.model
    });
    loggers.agentic('Direct AI response, widget sent', {
      model: response.model,
      usage: response.usage,
      finishReason: response.finishReason
    });
  }
  setIsGenerating(false);
}

export function _handleErrorResponse(
  error: unknown,
  chatState: ReturnType<typeof useChatOperations>,
  setIsGenerating: (value: boolean) => void
) {
  console.error('[useAIChat] Mutation error:', error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  chatState.showSystemMessage(`AI Error: ${errorMessage}`, 'error');
  loggers.agentic.error('AI generation failed', { error: errorMessage });
  setIsGenerating(false);
}
