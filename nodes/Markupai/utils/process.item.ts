import { IDataObject, IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { AGENT_ADDITIONAL_OPTION_FIELDS, COMMON_OPTION_FIELDS } from "./agent.input.coverage";
import { runAgent, pollWorkflowUntilDone } from "./agents.api.utils";
import { getIssueCountsFromResult } from "./issue.counts";
import { renderReport, type AgentResult } from "./report_template";
import type {
  AgentMetadata,
  AgentRunRequest,
  AgentRunResponse,
  IssueCounts,
} from "../Markupai.api.types";

type AdditionalOptions = {
  documentName?: string;
  documentRef?: string;
  domainIds?: string[];
  targetId?: string;
  timeout?: number;
};

function buildRunRequest(
  this: IExecuteFunctions,
  itemIndex: number,
  selectedAgentId: string,
  additionalOptions: AdditionalOptions,
): AgentRunRequest {
  const content = this.getNodeParameter("content", itemIndex) as string;
  const request: AgentRunRequest = { text: content };
  const allowedOptionFields =
    AGENT_ADDITIONAL_OPTION_FIELDS[selectedAgentId] ?? COMMON_OPTION_FIELDS;

  if (allowedOptionFields.includes("documentName") && additionalOptions.documentName) {
    request.document_name = additionalOptions.documentName;
  }
  if (allowedOptionFields.includes("documentRef") && additionalOptions.documentRef) {
    request.document_ref = additionalOptions.documentRef;
  }
  if (allowedOptionFields.includes("domainIds") && additionalOptions.domainIds?.length) {
    request.domain_ids = additionalOptions.domainIds.filter(Boolean);
  }
  if (allowedOptionFields.includes("targetId") && additionalOptions.targetId) {
    request.target_id = additionalOptions.targetId;
  }

  return request;
}

function getSelectedAgentName(allAgents: AgentMetadata[], selectedAgentIds: string[]): string {
  const selectedId = selectedAgentIds[0];
  if (!selectedId) return "";
  const match = allAgents.find((a) => a.id === selectedId);
  return match?.name ?? "";
}

function createSuccessResponse(
  response: AgentRunResponse,
  itemIndex: number,
  allAgents: AgentMetadata[],
  selectedAgentIds: string[],
  additionalOptions: AdditionalOptions,
  showNumericScores: boolean,
): INodeExecutionData {
  const issueCounts: IssueCounts = getIssueCountsFromResult(response.result);
  const baseResult: Record<string, unknown> = response.result ?? {};
  const resultForReport = {
    ...baseResult,
    issue_counts: issueCounts,
  };

  const effectiveDocumentRef = additionalOptions.documentRef ?? response.document_ref ?? null;

  const reportData: AgentResult = {
    type: "agent_run",
    timestamp: response.completed_at ?? response.started_at,
    workflow_id: response.workflow_id,
    agent_name: getSelectedAgentName(allAgents, selectedAgentIds),
    document_name: additionalOptions.documentName ?? null,
    document_ref: effectiveDocumentRef,
    result: resultForReport as unknown as AgentResult["result"],
    success: response.status === "completed",
  };

  const htmlReport = renderReport(reportData, { showNumericScores });

  const json: Record<string, unknown> = {
    workflow_id: response.workflow_id,
    status: response.status,
    document_ref: effectiveDocumentRef,
    result: response.result,
    started_at: response.started_at,
    completed_at: response.completed_at,
    duration_seconds: response.duration_seconds,
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

  throw new Error(`Workflow ended with status: ${response.status}`);
}

/**
 * Run a single item through the selected Markup AI agent and return the
 * formatted result. Throws on any failure; the n8n node's `execute()` is
 * responsible for honoring `this.continueOnFail()` and wrapping unknown
 * errors as `NodeOperationError`.
 */
export async function processMarkupaiItem(
  this: IExecuteFunctions,
  itemIndex: number,
  allAgents: AgentMetadata[],
  showNumericScores: boolean,
): Promise<INodeExecutionData> {
  const selectedAgentId = this.getNodeParameter("agents", itemIndex) as string;
  if (!selectedAgentId) {
    throw new Error("Select one agent");
  }

  const commonOptions = (this.getNodeParameter("additionalOptions", itemIndex) ?? {}) as {
    documentName?: string;
    documentRef?: string;
    timeout?: number;
  };
  const additionalOptions: AdditionalOptions = {
    documentName: commonOptions.documentName,
    documentRef: commonOptions.documentRef,
    timeout: commonOptions.timeout,
    domainIds: this.getNodeParameter("domainIds", itemIndex, []) as string[],
    targetId: this.getNodeParameter("targetId", itemIndex, "") as string,
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
      showNumericScores,
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
    showNumericScores,
  );
}
