import type { ChatEvent } from '~/app/map/Chat/_state/_events';
import {
  createUserMessageEvent,
  createSystemMessageEvent,
  createAssistantMessageEvent,
  createStreamingMessageStartEvent,
  createStreamingMessageDeltaEvent,
  createStreamingMessageEndEvent,
  createStreamingMessagePromptEvent,
  createToolCallStartEvent,
  createToolCallEndEvent,
} from '~/app/map/Chat/_state/_events';

/**
 * Message-related operations
 */
export function createMessageOperations(dispatch: (event: ChatEvent) => void) {
  return {
    sendMessage(text: string) {
      dispatch(createUserMessageEvent(text));
    },
    sendAssistantMessage(text: string) {
      dispatch(createAssistantMessageEvent(text));
    },
    showSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
      dispatch(createSystemMessageEvent(message, level));
    },
    // Streaming message operations
    startStreamingMessage(streamId: string, model?: string) {
      dispatch(createStreamingMessageStartEvent(streamId, model));
    },
    appendToStreamingMessage(streamId: string, delta: string) {
      dispatch(createStreamingMessageDeltaEvent(streamId, delta));
    },
    finalizeStreamingMessage(
      streamId: string,
      finalContent: string,
      usage?: { inputTokens?: number; outputTokens?: number }
    ) {
      dispatch(createStreamingMessageEndEvent(streamId, finalContent, usage));
    },
    setMessagePrompt(streamId: string, prompt: string) {
      dispatch(createStreamingMessagePromptEvent(streamId, prompt));
    },
    // Tool call operations
    startToolCall(streamId: string, toolCallId: string, toolName: string, toolArguments: Record<string, unknown>) {
      dispatch(createToolCallStartEvent(streamId, toolCallId, toolName, toolArguments));
    },
    endToolCall(streamId: string, toolCallId: string, result: string, success: boolean) {
      dispatch(createToolCallEndEvent(streamId, toolCallId, result, success));
    },
  };
}