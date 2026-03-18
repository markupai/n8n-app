import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  NodeApiError,
  NodeOperationError,
} from "n8n-workflow";
import { AGENT_ADDITIONAL_OPTION_FIELDS, COMMON_OPTION_FIELDS } from "./agent.input.coverage";
import { runAgent, pollWorkflowUntilDone } from "./agents.api.utils";
import { buildIssuesHtmlReport } from "./html.report";
import { getIssueCountsFromResult } from "./issue.counts";
import type {
  AgentMetadata,
  AgentRunRequest,
  AgentRunResponse,
  IssueCounts,
} from "../Markupai.api.types";

type AdditionalOptions = {
  documentName?: string;
  documentLink?: string;
  domainIds?: string[];
  orgName?: string;
  targetId?: string;
  contentProfileId?: string;
  timeout?: number;
};

function buildRunRequest(
  this: IExecuteFunctions,
  itemIndex: number,
  selectedAgentId: string,
  additionalOptions: AdditionalOptions,
): AgentRunRequest {
  const text = this.getNodeParameter("text", itemIndex) as string;
  const request: AgentRunRequest = { text };
  const allowedOptionFields =
    AGENT_ADDITIONAL_OPTION_FIELDS[selectedAgentId] ?? COMMON_OPTION_FIELDS;

  if (allowedOptionFields.includes("documentName") && additionalOptions.documentName) {
    request.document_name = additionalOptions.documentName;
  }
  if (allowedOptionFields.includes("documentLink") && additionalOptions.documentLink) {
    request.url = additionalOptions.documentLink;
  }
  if (allowedOptionFields.includes("domainIds") && additionalOptions.domainIds?.length) {
    request.domain_ids = additionalOptions.domainIds.filter(Boolean);
  }
  if (allowedOptionFields.includes("orgName") && additionalOptions.orgName) {
    request.org_name = additionalOptions.orgName;
  }
  if (allowedOptionFields.includes("targetId") && additionalOptions.targetId) {
    request.target_id = additionalOptions.targetId;
  }
  if (allowedOptionFields.includes("contentProfileId") && additionalOptions.contentProfileId) {
    request.content_profile_id = additionalOptions.contentProfileId;
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

function assertCompletedStatus(response: AgentRunResponse): void {
  if (response.status === "completed") {
    return;
  }

  throw new Error(
    response.error
      ? `Workflow ${response.status}: ${response.error}`
      : `Workflow ended with status: ${response.status}`,
  );
}

export async function processMarkupaiItem(
  this: IExecuteFunctions,
  itemIndex: number,
  allAgents: AgentMetadata[],
): Promise<INodeExecutionData> {
  try {
    const selectedAgentId = this.getNodeParameter("agents", itemIndex) as string;
    if (!selectedAgentId) {
      throw new Error("Select one agent");
    }

    const commonOptions = (this.getNodeParameter("additionalOptions", itemIndex) ?? {}) as {
      documentName?: string;
      documentLink?: string;
      timeout?: number;
    };
    const additionalOptions: AdditionalOptions = {
      documentName: commonOptions.documentName,
      documentLink: commonOptions.documentLink,
      timeout: commonOptions.timeout,
      domainIds: this.getNodeParameter("domainIds", itemIndex, []) as string[],
      orgName: this.getNodeParameter("orgName", itemIndex, "") as string,
      targetId: this.getNodeParameter("targetId", itemIndex, "") as string,
      contentProfileId: this.getNodeParameter("contentProfileId", itemIndex, "") as string,
    };

    const body = buildRunRequest.call(this, itemIndex, selectedAgentId, additionalOptions);
    const runResponse = await runAgent.call(this, selectedAgentId, body);

    const terminalStatuses = ["completed", "failed", "timed_out", "cancelled"];
    if (terminalStatuses.includes(runResponse.status)) {
      assertCompletedStatus(runResponse);
      return createSuccessResponse(
        runResponse,
        itemIndex,
        allAgents,
        [selectedAgentId],
        additionalOptions,
      );
    }

    const pollTimeoutMs = additionalOptions.timeout ?? 120_000;
    const finalResponse = await pollWorkflowUntilDone.call(
      this,
      runResponse.workflow_id,
      pollTimeoutMs,
    );

    assertCompletedStatus(finalResponse);

    return createSuccessResponse(
      finalResponse,
      itemIndex,
      allAgents,
      [selectedAgentId],
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
