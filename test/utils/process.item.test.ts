import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IExecuteFunctions } from "n8n-workflow";
import { NodeApiError, NodeOperationError } from "n8n-workflow";
import { processMarkupaiItem } from "../../nodes/Markupai/utils/process.item";
import type { AgentRunResponse } from "../../nodes/Markupai/Markupai.api.types";

vi.mock("../../nodes/Markupai/utils/agents.api.utils", () => ({
  runAgent: vi.fn(),
  pollWorkflowUntilDone: vi.fn(),
  listAllAgents: vi.fn().mockResolvedValue([
    { id: "ag_content_analysis", name: "Content Analysis" },
    { id: "ag_1", name: "terminology" },
    { id: "ag_2", name: "generic_claims" },
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

const createAgentRunResponse = (
  overrides: Partial<AgentRunResponse> = {},
): AgentRunResponse => ({
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
  return vi
    .fn()
    .mockImplementation((name: string) => {
      if (name === "agents") return ["ag_content_analysis"];
      if (name === "text") return "test content";
      if (name === "additionalOptions") return additionalOptions;
      return undefined;
    });
}

describe("process.item", () => {
  let mockRunAgent: ReturnType<typeof vi.fn>;
  let mockPollWorkflowUntilDone: ReturnType<typeof vi.fn>;

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
        );

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_content_analysis",
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

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

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
        );

        expect(result.json).toHaveProperty("html_report");
        const html = result.json.html_report as string;
        expect(html).toContain("Content Analysis Report");
        expect(html).toContain("Severity summary");
        expect(html).toContain("Agents");
      });

      it("passes documentName, documentLink, domainIds in request body", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({
            documentName: "doc.txt",
            documentLink: "https://example.com/doc",
            domainIds: "d1, d2",
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_content_analysis",
          expect.objectContaining({
            text: "test content",
            document_name: "doc.txt",
            url: "https://example.com/doc",
            domain_ids: ["d1", "d2"],
          }),
        );
      });

      it("uses parallel_executor and body.agents when multiple agents selected", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: vi.fn().mockImplementation((name: string) => {
            if (name === "agents") return ["ag_1", "ag_2"];
            if (name === "text") return "test content";
            if (name === "additionalOptions") return {};
            return undefined;
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_cnct5nkhtfNk",
          expect.objectContaining({
            text: "test content",
            agents: ["ag_1", "ag_2"],
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
        );

        expect(result.pairedItem).toEqual({ item: 2 });
      });
    });

    describe("Error handling", () => {
      it("returns error json when continueOnFail is true", async () => {
        mockRunAgent.mockRejectedValue(new Error("API request failed"));

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
          continueOnFail: vi.fn().mockReturnValue(true),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
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
          processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0),
        ).rejects.toThrow(NodeOperationError);
      });

      it("includes itemIndex in NodeOperationError", async () => {
        mockRunAgent.mockRejectedValue(new Error("API failed"));

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
          continueOnFail: vi.fn().mockReturnValue(false),
        });

        try {
          await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 3);
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(NodeOperationError);
          expect((error as NodeOperationError & { itemIndex?: number }).itemIndex).toBe(3);
        }
      });
    });
  });
});
