import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IExecuteFunctions } from "n8n-workflow";
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

function makeIssue(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    agent: "style_agent",
    severity: "high",
    category: "Tone",
    explanation: "Sample finding.",
    position: { start: 0, end: 4, text: "This" },
    ...overrides,
  };
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
        documentRef: additionalOptions.documentRef ?? "",
        timeout: additionalOptions.timeout ?? 120_000,
      };
    }
    if (name === "domainIds") return additionalOptions.domainIds ?? [];
    if (name === "targetId") return additionalOptions.targetId ?? "";
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
          false,
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

        await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
          false,
        );

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
          false,
        );

        expect(mockRunAgent).toHaveBeenCalled();
        expect(mockPollWorkflowUntilDone).not.toHaveBeenCalled();
        expect(result.json).toMatchObject({ status: "completed", result: { issues: [] } });
      });

      it("includes html_report with the new issue-level layout", async () => {
        mockRunAgent.mockResolvedValue(
          createCompletedResponse({
            result: {
              issues: [
                {
                  severity: "high",
                  agent: "style_agent",
                  category: "Tone",
                  explanation: "Use contractions to keep the tone conversational.",
                  position: { start: 0, end: 4, text: "This" },
                  suggestion: "It's",
                  guideline_name: "Did you use contractions?",
                  context_surface: "This product is amazing.",
                },
                {
                  severity: "medium",
                  agent: "style_agent",
                  category: "Clarity",
                  explanation: "Flesch-Kincaid grade level is high.",
                  position: { start: 0, end: 4, text: "This" },
                  guideline_name: "Flesch-Kincaid grade level",
                  context_surface: "This product is amazing.",
                },
              ],
            },
          }),
        );

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({ documentName: "Pricing page" }),
        });

        const result = await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
          false,
        );

        expect(result.json).toHaveProperty("html_report");
        const html = result.json.html_report as string;
        expect(html).toContain("Content Analysis Report");
        expect(html).toContain("Risk Assessment");
        expect(html).toContain("Severity breakdown");
        expect(html).toContain("Issues found");
        expect(html).toContain("Did you use contractions?");
        expect(html).toContain("Pricing page");
        // Non-numeric mode: per-goal scores and analysis index rows hidden.
        expect(html).not.toContain("Scores by goal");
      });

      it("adds issue_counts to response json", async () => {
        mockRunAgent.mockResolvedValue(
          createCompletedResponse({
            result: {
              issues: [
                makeIssue({ severity: "high" }),
                makeIssue({ severity: "high" }),
                makeIssue({ severity: "medium" }),
                makeIssue({ severity: "low" }),
                makeIssue({ severity: "not_a_valid_severity" }),
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
          false,
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

      it("passes documentName, documentRef, domainIds in snake_case request body", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({
            documentName: "doc.txt",
            documentRef: "cms-page-42",
            domainIds: ["d1", "d2"],
          }),
        });

        await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
          false,
        );

        const body = mockRunAgent.mock.calls[0][1] as Record<string, unknown>;
        expect(body).toMatchObject({
          text: "test content",
          document_name: "doc.txt",
          document_ref: "cms-page-42",
          domain_ids: ["d1", "d2"],
        });
        expect(body.url).toBeUndefined();
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

        await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
          false,
        );

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_xQGQvFQMsspF",
          expect.objectContaining({
            text: "test content",
          }),
        );
      });

      it("passes style-agent additional inputs in snake_case and drops auto-detected fields", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: vi.fn().mockImplementation((name: string) => {
            if (name === "agents") return "ag_vYCPHsSQnnJj";
            if (name === "content") return "test content";
            if (name === "additionalOptions") return { documentName: "Style doc" };
            if (name === "domainIds") return [];
            if (name === "targetId") return "target_123";
            return undefined;
          }),
        });

        await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
          false,
        );

        const body = mockRunAgent.mock.calls[0][1] as Record<string, unknown>;
        expect(body).toMatchObject({
          text: "test content",
          document_name: "Style doc",
          target_id: "target_123",
        });
        // Auto-detected fields are never sent to the API.
        expect(body.org_name).toBeUndefined();
        expect(body.content_profile_id).toBeUndefined();
        expect(body.url).toBeUndefined();
      });

      it("does not pass unsupported agent-specific options for non-style agents", async () => {
        mockRunAgent.mockResolvedValue(createCompletedResponse());

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({
            targetId: "target_123",
          }),
        });

        await processMarkupaiItem.call(
          mockExecuteFunctions as IExecuteFunctions,
          0,
          mockAllAgents,
          false,
        );

        expect(mockRunAgent).toHaveBeenCalledWith(
          "ag_WUijxT0DthMg",
          expect.not.objectContaining({ target_id: "target_123" }),
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
          false,
        );

        expect(result.pairedItem).toEqual({ item: 2 });
      });
    });

    describe("Error handling", () => {
      // processMarkupaiItem only runs the happy path now; honoring continueOnFail
      // and wrapping unknown errors as NodeOperationError lives in execute().
      // See test/nodes/Markupai.node.test.ts for those scenarios.

      it("throws when the workflow ends with a non-completed terminal status", async () => {
        mockRunAgent.mockResolvedValue(
          createAgentRunResponse({
            status: "failed",
          }),
        );

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
        });

        await expect(
          processMarkupaiItem.call(
            mockExecuteFunctions as IExecuteFunctions,
            0,
            mockAllAgents,
            false,
          ),
        ).rejects.toThrow("Workflow ended with status: failed");
      });

      it("propagates upstream errors unchanged", async () => {
        const apiFailure = new Error("API request failed");
        mockRunAgent.mockRejectedValue(apiFailure);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createGetNodeParameter({}),
        });

        await expect(
          processMarkupaiItem.call(
            mockExecuteFunctions as IExecuteFunctions,
            0,
            mockAllAgents,
            false,
          ),
        ).rejects.toBe(apiFailure);
      });
    });
  });
});
