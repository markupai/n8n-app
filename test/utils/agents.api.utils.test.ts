import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IExecuteFunctions } from "n8n-workflow";
import {
  runAgent,
  getWorkflowStatus,
  pollWorkflowUntilDone,
} from "../../nodes/Markupai/utils/agents.api.utils";
import type { AgentRunRequest, AgentRunResponse } from "../../nodes/Markupai/Markupai.api.types";

vi.mock("../../nodes/Markupai/utils/load.options", () => ({
  getBaseUrl: vi.fn(() => new URL("https://api.markup.ai/")),
}));

vi.mock("n8n-workflow", async () => {
  const actual = await vi.importActual<typeof import("n8n-workflow")>("n8n-workflow");
  return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

function createMockExecuteFunctions(mock: {
  helpers: {
    httpRequestWithAuthentication: { call: ReturnType<typeof vi.fn> };
  };
}): IExecuteFunctions {
  return mock as unknown as IExecuteFunctions;
}

describe("agents.api.utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runAgent", () => {
    const body: AgentRunRequest = { text: "Hello world" };
    const runResponse: AgentRunResponse = {
      workflow_id: "wf_123",
      status: "running",
      started_at: "2025-01-01T00:00:00Z",
    };

    it("calls POST /agents/{id}/run with body and wait false", async () => {
      const mockCall = vi.fn().mockResolvedValue({
        statusCode: 202,
        body: runResponse,
      });
      const mock = createMockExecuteFunctions({
        helpers: {
          httpRequestWithAuthentication: { call: mockCall },
        },
      });

      const result = await runAgent.call(mock, "ag_xxx", body);

      expect(result).toEqual(runResponse);
      expect(mockCall).toHaveBeenCalledWith(
        mock,
        "markupaiApi",
        expect.objectContaining({
          method: "POST",
          url: "https://api.markup.ai/agents/ag_xxx/run",
          qs: { wait: false },
          json: true,
          returnFullResponse: true,
        }),
      );
      const requestOptions = mockCall.mock.calls[0][2] as { body: AgentRunRequest };
      expect(requestOptions.body.text).toBe("Hello world");
    });

    it("throws when API returns error status", async () => {
      const mockCall = vi.fn().mockResolvedValue({
        statusCode: 422,
        body: { detail: "Invalid input" },
      });
      const mock = createMockExecuteFunctions({
        helpers: { httpRequestWithAuthentication: { call: mockCall } },
      });

      await expect(runAgent.call(mock, "ag_xxx", body)).rejects.toThrow();
    });

    it("encodes agent id in URL", async () => {
      const mockCall = vi.fn().mockResolvedValue({
        statusCode: 202,
        body: runResponse,
      });
      const mock = createMockExecuteFunctions({
        helpers: { httpRequestWithAuthentication: { call: mockCall } },
      });

      await runAgent.call(mock, "ag_abc/xyz", body);

      expect(mockCall).toHaveBeenCalledWith(
        mock,
        "markupaiApi",
        expect.objectContaining({
          url: "https://api.markup.ai/agents/ag_abc%2Fxyz/run",
        }),
      );
    });
  });

  describe("getWorkflowStatus", () => {
    const statusResponse: AgentRunResponse = {
      workflow_id: "wf_123",
      status: "completed",
      result: { issues: [] },
      started_at: "2025-01-01T00:00:00Z",
      completed_at: "2025-01-01T00:01:00Z",
    };

    it("calls GET /agents/workflows/{id} and returns parsed response", async () => {
      const mockCall = vi.fn().mockResolvedValue({
        statusCode: 200,
        body: statusResponse,
      });
      const mock = createMockExecuteFunctions({
        helpers: { httpRequestWithAuthentication: { call: mockCall } },
      });

      const result = await getWorkflowStatus.call(mock, "wf_123");

      expect(result).toEqual(statusResponse);
      expect(mockCall).toHaveBeenCalledWith(
        mock,
        "markupaiApi",
        expect.objectContaining({
          method: "GET",
          url: "https://api.markup.ai/agents/workflows/wf_123",
          returnFullResponse: true,
        }),
      );
    });

    it("throws when API returns error status", async () => {
      const mockCall = vi.fn().mockResolvedValue({
        statusCode: 404,
        body: { detail: "Workflow not found" },
      });
      const mock = createMockExecuteFunctions({
        helpers: { httpRequestWithAuthentication: { call: mockCall } },
      });

      await expect(getWorkflowStatus.call(mock, "wf_missing")).rejects.toThrow();
    });

    it("encodes workflow id in URL", async () => {
      const mockCall = vi.fn().mockResolvedValue({
        statusCode: 200,
        body: statusResponse,
      });
      const mock = createMockExecuteFunctions({
        helpers: { httpRequestWithAuthentication: { call: mockCall } },
      });

      await getWorkflowStatus.call(mock, "wf_abc/123");

      expect(mockCall).toHaveBeenCalledWith(
        mock,
        "markupaiApi",
        expect.objectContaining({
          url: "https://api.markup.ai/agents/workflows/wf_abc%2F123",
        }),
      );
    });
  });

  describe("pollWorkflowUntilDone", () => {
    it("polls getWorkflowStatus until terminal status and returns result", async () => {
      const running = {
        workflow_id: "wf_123",
        status: "running",
        started_at: "2025-01-01T00:00:00Z",
      };
      const completed = {
        workflow_id: "wf_123",
        status: "completed" as const,
        result: { issues: [] },
        started_at: "2025-01-01T00:00:00Z",
        completed_at: "2025-01-01T00:01:00Z",
      };
      const mockCall = vi
        .fn()
        .mockResolvedValueOnce({ statusCode: 200, body: running })
        .mockResolvedValueOnce({ statusCode: 200, body: running })
        .mockResolvedValue({ statusCode: 200, body: completed });

      const mock = createMockExecuteFunctions({
        helpers: { httpRequestWithAuthentication: { call: mockCall } },
      });

      const result = await pollWorkflowUntilDone.call(mock, "wf_123", 30_000);

      expect(result.status).toBe("completed");
      expect(result.result).toEqual({ issues: [] });
      expect(mockCall).toHaveBeenCalledTimes(3);
    });

    it("returns immediately when first status is already terminal", async () => {
      const failed = {
        workflow_id: "wf_123",
        status: "failed" as const,
        error: "Agent error",
        started_at: "2025-01-01T00:00:00Z",
      };
      const mockCall = vi.fn().mockResolvedValue({ statusCode: 200, body: failed });
      const mock = createMockExecuteFunctions({
        helpers: { httpRequestWithAuthentication: { call: mockCall } },
      });

      const result = await pollWorkflowUntilDone.call(mock, "wf_123", 30_000);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Agent error");
      expect(mockCall).toHaveBeenCalledTimes(1);
    });

    it("throws when timeout is exceeded", async () => {
      const running = {
        workflow_id: "wf_123",
        status: "running",
        started_at: "2025-01-01T00:00:00Z",
      };
      const mockCall = vi.fn().mockResolvedValue({ statusCode: 200, body: running });
      const mock = createMockExecuteFunctions({
        helpers: { httpRequestWithAuthentication: { call: mockCall } },
      });

      await expect(
        pollWorkflowUntilDone.call(mock, "wf_123", 100),
      ).rejects.toThrow(/Workflow polling timeout/);
    });
  });
});
