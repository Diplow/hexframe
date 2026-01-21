export type RunStatus = "open" | "blocked" | "closed";

export interface ExecutionLogEntry {
  stepCoords: string;
  stepTitle?: string;
  status: "completed" | "blocked";
  startedAt: string;
  completedAt?: string;
  blockageReason?: string;
  agentResponse?: string;
  hexecutePrompt?: string;
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
