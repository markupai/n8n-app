import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  IExecuteFunctions,
  INodeCredentialDescription,
  INodeExecutionData,
} from "n8n-workflow";
import { Markupai } from "../../nodes/Markupai/Markupai.node";

vi.mock("n8n-workflow", async () => {
  const actual = await vi.importActual("n8n-workflow");
  return {
    ...actual,
    NodeConnectionTypes: {
      Main: "main",
    },
    NodeApiError: class NodeApiError extends Error {
      constructor(_: unknown, error: { message?: string }) {
        super(error.message || "Node API Error");
        this.name = "NodeApiError";
      }
    },
  };
});

vi.mock("../../nodes/Markupai/utils/load.options", () => ({
  loadAgents: vi.fn(),
}));

vi.mock("../../nodes/Markupai/utils/agents.api.utils", () => ({
  runAgent: vi.fn(),
  listAllAgents: vi.fn().mockResolvedValue([
    { id: "ag_content_analysis", name: "Content Analysis" },
  ]),
}));

const createRunResponse = () => ({
  workflow_id: "wf_123",
  status: "completed" as const,
  result: { issues: [] },
  started_at: "2025-01-01T00:00:00Z",
  completed_at: "2025-01-01T00:01:00Z",
});

describe("Markupai", () => {
  let markupai: Markupai;
  let mockExecuteFunctions: Partial<IExecuteFunctions>;

  beforeEach(() => {
    vi.clearAllMocks();
    markupai = new Markupai();

    mockExecuteFunctions = {
      getInputData: vi.fn(),
      getNodeParameter: vi.fn(),
      helpers: {
        createDeferredPromise: vi.fn(),
        returnJsonArray: vi.fn(),
      },
      getNode: vi.fn(),
    } as unknown as Partial<IExecuteFunctions>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Node Description", () => {
    it("should have correct basic properties", () => {
      expect(markupai.description.displayName).toBe("Markup AI");
      expect(markupai.description.name).toBe("markupai");
      expect(markupai.description.description).toBe("Run Markup AI agents for content analysis");
      expect(markupai.description.icon).toBe("file:markupai.svg");
      expect(markupai.description.version).toBe(1);
    });

    it("should have correct default name", () => {
      expect(markupai.description.defaults.name).toBe("Markup AI");
    });

    it("should have correct inputs and outputs", () => {
      expect(markupai.description.inputs).toHaveLength(1);
      expect(markupai.description.outputs).toHaveLength(1);
    });

    it("should have correct credentials configuration", () => {
      const credentials = markupai.description.credentials as INodeCredentialDescription[];
      expect(credentials).toHaveLength(1);
      expect(credentials[0].name).toBe("markupaiApi");
      expect(credentials[0].required).toBe(true);
    });

    it("should have resource Agent and operation Run Agent", () => {
      const properties = markupai.description.properties;
      const resourceProp = properties.find((p) => p.name === "resource");
      expect(resourceProp?.type).toBe("options");
      expect(resourceProp?.default).toBe("agent");

      const operationProp = properties.find((p) => p.name === "operation");
      expect(operationProp?.type).toBe("options");
      expect(operationProp?.default).toBe("runAgent");
    });

    it("should have agents (multiOptions) and text parameters with loadAgents", () => {
      const properties = markupai.description.properties;
      const agentsProp = properties.find((p) => p.name === "agents");
      expect(agentsProp?.type).toBe("multiOptions");
      expect(agentsProp?.typeOptions?.loadOptionsMethod).toBe("loadAgents");
      expect(agentsProp?.required).toBe(true);

      const textProp = properties.find((p) => p.name === "text");
      expect(textProp?.type).toBe("string");
      expect(textProp?.required).toBe(true);
    });

    it("should have additional options (documentName, documentLink, domainIds, timeout)", () => {
      const additionalOptionsProp = markupai.description.properties.find(
        (p) => p.name === "additionalOptions",
      );
      expect(additionalOptionsProp?.type).toBe("collection");

      const options = additionalOptionsProp?.options ?? [];
      const names = options.map((o) => o.name);
      expect(names).toContain("documentName");
      expect(names).toContain("documentLink");
      expect(names).toContain("domainIds");
      expect(names).toContain("timeout");
      expect(names).not.toContain("waitForCompletion");

      const timeoutOption = options.find((o) => o.name === "timeout");
      expect(timeoutOption?.type).toBe("number");
      expect(timeoutOption?.default).toBe(120_000);
    });
  });

  describe("Methods", () => {
    it("should have loadAgents in loadOptions", () => {
      expect(markupai.methods.loadOptions.loadAgents).toBeDefined();
    });
  });

  describe("Execute Method", () => {
    const mockInputData: INodeExecutionData[] = [{ json: { test: "data" } }];

    beforeEach(async () => {
      const { runAgent } = await import("../../nodes/Markupai/utils/agents.api.utils");
      vi.mocked(runAgent).mockResolvedValue(createRunResponse());

      mockExecuteFunctions.getInputData = vi.fn().mockReturnValue(mockInputData);
      mockExecuteFunctions.getNodeParameter = vi
        .fn()
        .mockImplementation((name: string) => {
          if (name === "agents") return ["ag_content_analysis"];
          if (name === "text") return "test content";
          if (name === "additionalOptions") return {};
          return undefined;
        });
      if (mockExecuteFunctions.helpers) {
        mockExecuteFunctions.helpers.returnJsonArray = vi
          .fn()
          .mockImplementation((data: INodeExecutionData[]) => data);
      }
      mockExecuteFunctions.continueOnFail = vi.fn().mockReturnValue(false);
    });

    it("should execute and return workflow result", async () => {
      const result = await markupai.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toMatchObject({
        workflow_id: "wf_123",
        status: "completed",
        result: { issues: [] },
      });
      expect(result[0][0].pairedItem).toEqual({ item: 0 });
    });

    it("should handle multiple items", async () => {
      const twoItems: INodeExecutionData[] = [{ json: {} }, { json: {} }];
      mockExecuteFunctions.getInputData = vi.fn().mockReturnValue(twoItems);
      mockExecuteFunctions.getNodeParameter = vi
        .fn()
        .mockImplementation((name: string) => {
          if (name === "agents") return ["ag_1"];
          if (name === "text") return "content";
          if (name === "additionalOptions") return {};
          return undefined;
        });

      const result = await markupai.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].pairedItem).toEqual({ item: 0 });
      expect(result[0][1].pairedItem).toEqual({ item: 1 });
    });

    it("should throw when processMarkupaiItem throws and continueOnFail is false", async () => {
      const { runAgent } = await import("../../nodes/Markupai/utils/agents.api.utils");
      vi.mocked(runAgent).mockRejectedValue(new Error("API failed"));
      mockExecuteFunctions.continueOnFail = vi.fn().mockReturnValue(false);

      await expect(
        markupai.execute.call(mockExecuteFunctions as IExecuteFunctions),
      ).rejects.toThrow();
    });
  });
});
