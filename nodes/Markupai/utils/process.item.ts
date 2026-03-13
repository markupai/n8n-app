import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  NodeApiError,
  NodeOperationError,
} from "n8n-workflow";
import { runAgent, pollWorkflowUntilDone, listAllAgents } from "./agents.api.utils";
import { buildIssuesHtmlReport } from "./html.report";
import { getIssueCountsFromResult } from "./issue.counts";
import type {
  AgentMetadata,
  AgentRunRequest,
  AgentRunResponse,
  IssueCounts,
} from "../Markupai.api.types";

const PARALLEL_EXECUTOR_AGENT_ID = "ag_cnct5nkhtfNk";

type AdditionalOptions = {
  documentName?: string;
  documentLink?: string;
  domainIds?: string;
  timeout?: number;
};

function buildRunRequest(
  this: IExecuteFunctions,
  itemIndex: number,
  additionalOptions: AdditionalOptions,
): AgentRunRequest {
  const text = this.getNodeParameter("text", itemIndex) as string;
  const request: AgentRunRequest = { text };

  if (additionalOptions.documentName) {
    request.document_name = additionalOptions.documentName;
  }
  if (additionalOptions.documentLink) {
    request.url = additionalOptions.documentLink;
  }
  if (additionalOptions.domainIds) {
    request.domain_ids = additionalOptions.domainIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return request;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof NodeApiError) {
    return error.description || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof NodeApiError) {
    return error.description ?? undefined;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function createErrorResponse(error: unknown, itemIndex: number): INodeExecutionData {
  return {
    json: { error: getErrorMessage(error) },
    pairedItem: { item: itemIndex },
  };
}

function createSuccessResponse(
  response: AgentRunResponse,
  itemIndex: number,
  allAgents: AgentMetadata[],
  selectedAgentIds: string[],
  additionalOptions: AdditionalOptions,
): INodeExecutionData {
  const issueCounts: IssueCounts = getIssueCountsFromResult(response.result);
  const htmlReport = buildIssuesHtmlReport({
    allAgents,
    selectedAgentIds,
    result: response.result ?? undefined,
    issueCounts,
    documentName: additionalOptions.documentName,
    documentUrl: additionalOptions.documentLink,
    workflowId: response.workflow_id,
    status: response.status,
    startedAt: response.started_at,
    completedAt: response.completed_at ?? undefined,
  });
  const json: Record<string, unknown> = {
    workflow_id: response.workflow_id,
    status: response.status,
    result: response.result,
    started_at: response.started_at,
    completed_at: response.completed_at,
    duration_seconds: response.duration_seconds,
    error: response.error,
    issue_counts: issueCounts,
    html_report: htmlReport,
  };
  return {
    json: json as IDataObject,
    pairedItem: { item: itemIndex },
  };
}

export async function processMarkupaiItem(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData> {
  try {
    const selectedAgents = this.getNodeParameter("agents", itemIndex) as string[];
    if (selectedAgents.length === 0) {
      throw new Error("Select at least one agent");
    }

    const additionalOptions = (this.getNodeParameter("additionalOptions", itemIndex) ??
      {}) as AdditionalOptions;

    const body = buildRunRequest.call(this, itemIndex, additionalOptions);

    const agentId = selectedAgents.length === 1 ? selectedAgents[0] : PARALLEL_EXECUTOR_AGENT_ID;
    if (selectedAgents.length > 1) {
      body.agents = selectedAgents.slice(0, 10);
    }

    const [runResponse, allAgents] = await Promise.all([
      runAgent.call(this, agentId, body),
      listAllAgents.call(this),
    ]);

    const terminalStatuses = ["completed", "failed", "timed_out", "cancelled"];
    if (terminalStatuses.includes(runResponse.status)) {
      return createSuccessResponse(
        runResponse,
        itemIndex,
        allAgents,
        selectedAgents,
        additionalOptions,
      );
    }

    const pollTimeoutMs = additionalOptions.timeout ?? 120_000;
    const finalResponse = await pollWorkflowUntilDone.call(
      this,
      runResponse.workflow_id,
      pollTimeoutMs,
    );
    return createSuccessResponse(
      finalResponse,
      itemIndex,
      allAgents,
      selectedAgents,
      additionalOptions,
    );
  } catch (error) {
    if (this.continueOnFail()) {
      return createErrorResponse(error, itemIndex);
    }

    throw new NodeOperationError(
      this.getNode(),
      error instanceof Error ? error : new Error(String(error)),
      {
        description: getErrorDescription(error),
        itemIndex,
      },
    );
  }
}
