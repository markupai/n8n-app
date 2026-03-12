/** Workflow status from Agents API */
export type WorkflowStatus =
  | "running"
  | "completed"
  | "failed"
  | "timed_out"
  | "cancelled";

export interface AgentMetadata {
  id: string;
  name: string;
  description?: string | null;
  input_schema?: Record<string, unknown> | null;
  output_schema?: Record<string, unknown> | null;
  tags?: string[];
}

export interface AgentListResult {
  agents: AgentMetadata[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AgentRunRequest {
  text: string;
  agents?: string[] | null;
  domain_ids?: string[] | null;
  url?: string | null;
  document_name?: string | null;
  webhook_url?: string | null;
}

export interface AgentRunResponse {
  workflow_id: string;
  status: WorkflowStatus;
  result?: Record<string, unknown> | null;
  started_at: string;
  completed_at?: string | null;
  duration_seconds?: number | null;
  error?: string | null;
}
