export type RunStatus = "open" | "blocked" | "closed";

export interface ToolCallEntry {
  toolCallId: string;
  toolName: string;
  arguments?: string;
  result?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface ExecutionLogEntry {
  stepCoords: string;
  stepTitle?: string;
  status: "completed" | "blocked";
  startedAt: string;
  completedAt?: string;
  blockageReason?: string;
  agentResponse?: string;
  hexecutePrompt?: string;
  hexplanContent?: string;
  toolCalls?: ToolCallEntry[];
}

export interface Run {
  id: string;
  userId: string;
  rootCoords: string;
  status: RunStatus;
  blockageReason: string | null;
  executionLog: ExecutionLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}
