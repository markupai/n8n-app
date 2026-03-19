import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IExecuteFunctions } from "n8n-workflow";
import { NodeApiError, NodeOperationError } from "n8n-workflow";
import { processMarkupaiItem } from "../../nodes/Markupai/utils/process.item";
import type { AgentRunResponse } from "../../nodes/Markupai/Markupai.api.types";

vi.mock("../../nodes/Markupai/utils/agents.api.utils", () => ({
  runAgent: vi.fn(),
  pollWorkflowUntilDone: vi.fn(),
  listAllAgents: vi.fn().mockResolvedValue([
    { id: "ag_WUijxT0DthMg", name: "terminology" },
    { id: "ag_xQGQvFQMsspF", name: "generic_claims" },
    { id: "ag_vYCPHsSQnnJj", name: "style_agent" },
  ]),
}));

vi.mock("n8n-workflow", async () => {
  const actual = await vi.importActual("n8n-workflow");
  return {
    ...actual,
    NodeApiError: class NodeApiError extends Error {
      description?: string;
      constructor(_: unknown, error: { message?: string; description?: string }) {
        super(error.message || "Node API Error");
        this.name = "NodeApiError";
        this.description = error.description ?? error.message;
      }
    },
    NodeOperationError: class NodeOperationError extends Error {
      description?: string;
      itemIndex?: number;
      constructor(
        node: unknown,
        error: Error | { message?: string },
        options?: { description?: string; itemIndex?: number },
      ) {
        super(error instanceof Error ? error.message : "Node Operation Error");
        this.name = "NodeOperationError";
        this.description = options?.description;
        this.itemIndex = options?.itemIndex;
      }
    },
  };
});

function createMockNode() {
  return {} as never;
}

const createAgentRunResponse = (overrides: Partial<AgentRunResponse> = {}): AgentRunResponse => ({
  workflow_id: "wf_123",
  status: "running",
  started_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

const createCompletedResponse = (overrides: Partial<AgentRunResponse> = {}): AgentRunResponse =>
  createAgentRunResponse({
    status: "completed",
    result: { issues: [] },
    completed_at: "2025-01-01T00:01:00Z",
    duration_seconds: 60,
    ...overrides,
  });

const createMockExecuteFunctions = (
  overrides: Partial<IExecuteFunctions> = {},
): Partial<IExecuteFunctions> => ({
  getNodeParameter: vi.fn(),
  getNode: vi.fn().mockReturnValue({ name: "Markup AI" }),
  continueOnFail: vi.fn().mockReturnValue(false),
  ...overrides,
});

function createGetNodeParameter(additionalOptions: Record<string, unknown> = {}) {
  return vi.fn().mockImplementation((name: string) => {
    if (name === "agents") return "ag_WUijxT0DthMg";
    if (name === "content") return "test content";
    if (name === "additionalOptions") {
      return {
        documentName: additionalOptions.documentName ?? "",
        documentLink: additionalOptions.documentLink ?? "",
        timeout: additionalOptions.timeout ?? 120_000,
      };
    }
    if (name === "domainIds") return additionalOptions.domainIds ?? [];
    if (name === "orgName") return additionalOptions.orgName ?? "";
    if (name === "targetId") return additionalOptions.targetId ?? "";
    if (name === "contentProfileId") return additionalOptions.contentProfileId ?? "";
    return undefined;
  });
}

describe("process.item", () => {
  let mockRunAgent: ReturnType<typeof vi.fn>;
  let mockPollWorkflowUntilDone: ReturnType<typeof vi.fn>;
  const mockAllAgents = [
    { id: "ag_WUijxT0DthMg", name: "terminology" },
    { id: "ag_xQGQvFQMsspF", name: "generic_claims" },
    { id: "ag_vYCPHsSQnnJj", name: "style_agent" },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    const agentsUtils = await import("../../nodes/Markupai/utils/agents.api.utils");
    mockRunAgent = vi.mocked(agentsUtils.runAgent);
    mockPollWorkflowUntilDone = vi.mocked(agentsUtils.pollWorkflowUntilDone);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("processMarkupaiItem", () => {
    describe("Success scenarios", () => {
      it("polls until done when run returns running and returns final result", async () => {
        mockRunAgent.mockResolvedValue(createAgentRunResponse({ status: "running" }));
        mockPollWorkflowUntilDone.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
        );

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_WUijxT0DthMg",
          expect.objectContaining({ text: "test content" }),
        );
        expect(mockPollWorkflowUntilDone).toHaveBeenCalledWith("wf_123", 120_000);
        expect(result.json).toMatchObject({
          workflow_id: "wf_123",
          status: "completed",
          result: { issues: [] },
        });
        expect(result.pairedItem).toEqual({ item: 0 });
      });

      it("uses custom timeout from additionalOptions when polling", async () => {
        mockRunAgent.mockResolvedValue(createAgentRunResponse({ status: "running" }));
        mockPollWorkflowUntilDone.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({ timeout: 60_000 }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0, mockAllAgents);

        expect(mockPollWorkflowUntilDone).toHaveBeenCalledWith("wf_123", 60_000);
      });

      it("returns run response immediately when run already completed", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
        );

        expect(mockRunAgent).toHaveBeenCalled();
        expect(mockPollWorkflowUntilDone).not.toHaveBeenCalled();
        expect(result.json).toMatchObject({ status: "completed", result: { issues: [] } });
      });

      it("includes html_report with Document Analysis Report layout", async () => {
        mockRunAgent.mockResolvedValue(
          createCompletedResponse({
            result: {
              issues: [
                { severity: "high", agent_id: "ag_content_analysis" },
                { severity: "medium", agent_id: "ag_content_analysis" },
              ],
            },
          }),
        );

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
        );

        expect(result.json).toHaveProperty("html_report");
        const html = result.json.html_report as string;
        expect(html).toContain("Content Analysis Report");
        expect(html).toContain("Severity summary");
        expect(html).toContain("Agents");
      });

      it("adds issue_counts to response json", async () => {
        mockRunAgent.mockResolvedValue(
          createCompletedResponse({
            result: {
              issues: [
                { severity: "high", agent_id: "ag_content_analysis" },
                { severity: "high", agent_id: "ag_content_analysis" },
                { severity: "medium", agent_id: "ag_content_analysis" },
                { severity: "low", agent_id: "ag_content_analysis" },
                { severity: "not_a_valid_severity", agent_id: "ag_content_analysis" },
              ],
            },
          }),
        );

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
        );

        expect(result.json).toMatchObject({
          issue_counts: {
            total: 4,
            high: 2,
            medium: 1,
            low: 1,
          },
        });
      });

      it("passes documentName, documentLink, domainIds in request body", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({
            documentName: "doc.txt",
            documentLink: "https://example.com/doc",
            domainIds: ["d1", "d2"],
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0, mockAllAgents);

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_WUijxT0DthMg",
          expect.objectContaining({
            text: "test content",
            document_name: "doc.txt",
            url: "https://example.com/doc",
            domain_ids: ["d1", "d2"],
          }),
        );
      });

      it("uses selected agent ID directly for runAgent", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: vi.fn().mockImplementation((name: string) => {
            if (name === "agents") return "ag_xQGQvFQMsspF";
            if (name === "content") return "test content";
            if (name === "additionalOptions") return {};
            if (name === "domainIds") return [];
            return undefined;
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0, mockAllAgents);

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_xQGQvFQMsspF",
          expect.objectContaining({
            text: "test content",
          }),
        );
      });

      it("passes style-agent additional inputs in snake_case request body", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: vi.fn().mockImplementation((name: string) => {
            if (name === "agents") return "ag_vYCPHsSQnnJj";
            if (name === "content") return "test content";
            if (name === "additionalOptions") return {};
            if (name === "domainIds") return [];
            if (name === "orgName") return "Markup AI";
            if (name === "targetId") return "target_123";
            if (name === "contentProfileId") return "profile_456";
            return undefined;
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0, mockAllAgents);

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_vYCPHsSQnnJj",
          expect.objectContaining({
            text: "test content",
            org_name: "Markup AI",
            target_id: "target_123",
            content_profile_id: "profile_456",
          }),
        );
      });

      it("does not pass unsupported agent-specific options for non-style agents", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({
            orgName: "Markup AI",
            targetId: "target_123",
            contentProfileId: "profile_456",
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0, mockAllAgents);

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_WUijxT0DthMg",
          expect.not.objectContaining({
            org_name: "Markup AI",
            target_id: "target_123",
            content_profile_id: "profile_456",
          }),
        );
      });

      it("returns pairedItem with correct item index", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          2,
          mockAllAgents,
        );

        expect(result.pairedItem).toEqual({ item: 2 });
      });
    });

    describe("Error handling", () => {
      it("throws NodeOperationError when run response is terminal but not completed", async () => {
        mockRunAgent.mockResolvedValue(
          createAgentRunResponse({
            status: "failed",
            error: "Policy check failed",
          }),
        );

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
          continueOnFail: vi.fn().mockReturnValue(false),
        });

        await expect(
          processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0, mockAllAgents),
        ).rejects.toThrow(NodeOperationError);
      });

      it("returns error item when run response is terminal but not completed and continueOnFail is true", async () => {
        mockRunAgent.mockResolvedValue(
          createAgentRunResponse({
            status: "timed_out",
          }),
        );

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
          continueOnFail: vi.fn().mockReturnValue(true),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
        );

        expect(result).toEqual({
          json: { error: "Workflow ended with status: timed_out" },
          pairedItem: { item: 0 },
        });
      });

      it("returns error json when continueOnFail is true", async () => {
        mockRunAgent.mockRejectedValue(new Error("API request failed"));

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
          continueOnFail: vi.fn().mockReturnValue(true),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
        );

        expect(result).toEqual({
          json: { error: "API request failed" },
          pairedItem: { item: 0 },
        });
      });

      it("uses NodeApiError description when continueOnFail is true", async () => {
        const nodeApiError = new NodeApiError(createMockNode(), {
          message: "API Error",
          description: "Custom error description",
        });
        mockRunAgent.mockRejectedValue(nodeApiError);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
          continueOnFail: vi.fn().mockReturnValue(true),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
        );

        expect(result.json).toHaveProperty("error", "Custom error description");
      });

      it("throws NodeOperationError when continueOnFail is false", async () => {
        mockRunAgent.mockRejectedValue(new Error("API request failed"));

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
          continueOnFail: vi.fn().mockReturnValue(false),
        });

        await expect(
          processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0, mockAllAgents),
        ).rejects.toThrow(NodeOperationError);
      });

      it("includes itemIndex in NodeOperationError", async () => {
        mockRunAgent.mockRejectedValue(new Error("API failed"));

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
          continueOnFail: vi.fn().mockReturnValue(false),
        });

        try {
          await processMarkupaiItem.call(
            mockExecuteFunctions as IExecuteFunctions,
            3,
            mockAllAgents,
          );
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(NodeOperationError);
          expect((error as NodeOperationError & { itemIndex?: number }).itemIndex).toBe(3);
        }
      });
    });
  });
});
