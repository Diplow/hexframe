export interface ToolCallDisplay {
  toolCallId: string;
  toolName: string;
  arguments?: string;
  result?: string;
  error?: string;
  durationMs?: number;
}

export interface ExecutedStep {
  coords: string;
  title: string;
  status: 'completed' | 'blocked' | 'error';
  timestamp: Date;
  prompt?: string;
  agentResponse?: string;
  hexplanContent?: string;
  toolCalls?: ToolCallDisplay[];
}

export type ExpandedSection = 'none' | 'prompt' | 'response' | 'hexplan' | 'toolCalls';
