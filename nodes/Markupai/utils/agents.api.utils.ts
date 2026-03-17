import type { IExecuteFunctions, IHttpRequestOptions } from "n8n-workflow";
import { getBaseUrl } from "./load.options";
import type {
  AgentListResult,
  AgentMetadata,
  AgentRunRequest,
  AgentRunResponse,
} from "../Markupai.api.types";

const AGENTS_PATH = "agents";
const WORKFLOWS_PATH = "agents/workflows";

function buildApiUrl(baseUrl: URL, path: string): string {
  const normalizedBaseUrl = new URL(
    baseUrl.toString().endsWith("/") ? baseUrl.toString() : `${baseUrl.toString()}/`,
  );
  return new URL(path, normalizedBaseUrl).toString();
}

export async function listAllAgents(this: IExecuteFunctions): Promise<AgentMetadata[]> {
  const baseUrl = getBaseUrl();

  const requestOptions: IHttpRequestOptions = {
    method: "GET",
    url: buildApiUrl(baseUrl, AGENTS_PATH),
    qs: { page: 1, page_size: 100 },
    returnFullResponse: true,
  };

  const response = (await this.helpers.httpRequestWithAuthentication.call(
    this,
    "markupaiApi",
    requestOptions,
  )) as { statusCode: number; body: unknown };

  if (response.statusCode != 200) {
    return [];
  }

  const bodyStr = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
  const parsed = JSON.parse(bodyStr) as AgentListResult;

  return parsed.agents;
}

export async function runAgent(
  this: IExecuteFunctions,
  agentId: string,
  body: AgentRunRequest,
): Promise<AgentRunResponse> {
  const baseUrl = getBaseUrl();

  const requestOptions: IHttpRequestOptions = {
    method: "POST",
    url: buildApiUrl(baseUrl, `${AGENTS_PATH}/${encodeURIComponent(agentId)}/run`),
    qs: { wait: false },
    body: body as unknown as Record<string, unknown>,
    json: true,
    returnFullResponse: true,
  };

  const response = (await this.helpers.httpRequestWithAuthentication.call(
    this,
    "markupaiApi",
    requestOptions,
  )) as { statusCode: number; body: unknown };

  const bodyStr = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
  const parsed = JSON.parse(bodyStr) as AgentRunResponse;

  if (response.statusCode >= 400) {
    const err = parsed as { error?: string; detail?: string };
    throw new Error(err.error ?? err.detail ?? bodyStr);
  }

  return parsed;
}

const TERMINAL_STATUSES = ["completed", "failed", "timed_out", "cancelled"] as const;

function isTerminalStatus(s: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(s);
}

/** Poll workflow status until terminal (result or failure) or timeout. */
export async function pollWorkflowUntilDone(
  this: IExecuteFunctions,
  workflowId: string,
  timeoutMs: number,
): Promise<AgentRunResponse> {
  const { sleep } = await import("n8n-workflow");
  const pollIntervalMs = 2_000;
  const start = Date.now();
  const deadline = start + timeoutMs;

  while (Date.now() - start <= timeoutMs) {
    const status = await getWorkflowStatus.call(this, workflowId);
    if (isTerminalStatus(status.status)) {
      return status;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await sleep(Math.min(pollIntervalMs, remainingMs));
  }

  throw new Error(`Workflow polling timeout after ${String(timeoutMs)}ms`);
}

export async function getWorkflowStatus(
  this: IExecuteFunctions,
  workflowId: string,
): Promise<AgentRunResponse> {
  const baseUrl = getBaseUrl();

  const requestOptions: IHttpRequestOptions = {
    method: "GET",
    url: buildApiUrl(baseUrl, `${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}`),
    returnFullResponse: true,
  };

  const response = (await this.helpers.httpRequestWithAuthentication.call(
    this,
    "markupaiApi",
    requestOptions,
  )) as { statusCode: number; body: unknown };

  const bodyStr = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
  const parsed = JSON.parse(bodyStr) as AgentRunResponse;

  if (response.statusCode >= 400) {
    const err = parsed as { error?: string; detail?: string };
    throw new Error(err.error ?? err.detail ?? bodyStr);
  }

  return parsed;
}
