import { describe, it, expect, vi } from "vitest";
import { NodeApiError } from "n8n-workflow";
import type { ILoadOptionsFunctions, INode } from "n8n-workflow";
import {
  assertStyleAgentEnabled,
  getStyleAgentConfig,
  listStyleGuides,
  STYLE_AGENT_DISABLED_MESSAGE,
} from "../../nodes/Markupai/utils/style_agent_api";
import type {
  OrganizationConfigResponse,
  StyleGuide,
} from "../../nodes/Markupai/Markupai.api.types";

function stubNode(): INode {
  return {
    id: "test-node",
    name: "Markup AI",
    type: "n8n-nodes-markupai.markupai",
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  };
}

function createMockContext(mockCall: ReturnType<typeof vi.fn>): ILoadOptionsFunctions {
  return {
    getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
    getNode: () => stubNode(),
    helpers: {
      httpRequestWithAuthentication: {
        call: mockCall,
      },
    },
  } as unknown as ILoadOptionsFunctions;
}

describe("style_agent_api", () => {
  describe("getStyleAgentConfig", () => {
    it("returns the parsed org config on 200", async () => {
      const config: OrganizationConfigResponse = {
        is_acrolinx_classic: false,
        style_agent: "enabled",
        style_agent_numeric_scoring: true,
      };
      const mockCall = vi.fn().mockResolvedValue({ statusCode: 200, body: config });
      const ctx = createMockContext(mockCall);

      const result = await getStyleAgentConfig.call(ctx);

      expect(result).toEqual(config);
      expect(mockCall).toHaveBeenCalledWith(
        ctx,
        "markupaiApi",
        expect.objectContaining({
          method: "GET",
          url: "https://api.markup.ai/style-agent/config",
        }),
      );
    });

    it("throws a NodeApiError on non-200 status", async () => {
      const mockCall = vi
        .fn()
        .mockResolvedValue({ statusCode: 500, body: { detail: "server boom" } });
      const ctx = createMockContext(mockCall);

      const promise = getStyleAgentConfig.call(ctx);
      await expect(promise).rejects.toBeInstanceOf(NodeApiError);
      await expect(promise).rejects.toMatchObject({ httpCode: "500" });
    });
  });

  describe("assertStyleAgentEnabled", () => {
    it("passes when style_agent is enabled", () => {
      expect(() => {
        assertStyleAgentEnabled({
          is_acrolinx_classic: false,
          style_agent: "enabled",
          style_agent_numeric_scoring: false,
        });
      }).not.toThrow();
    });

    it("passes when style_agent is enabled_terminology", () => {
      expect(() => {
        assertStyleAgentEnabled({
          is_acrolinx_classic: false,
          style_agent: "enabled_terminology",
          style_agent_numeric_scoring: false,
        });
      }).not.toThrow();
    });

    it("throws the canonical disabled message when style_agent is disabled", () => {
      expect(() => {
        assertStyleAgentEnabled({
          is_acrolinx_classic: false,
          style_agent: "disabled",
          style_agent_numeric_scoring: false,
        });
      }).toThrow(STYLE_AGENT_DISABLED_MESSAGE);
    });
  });

  describe("listStyleGuides", () => {
    it("returns only enabled style guides, parsed as an array", async () => {
      const apiStyleGuides: StyleGuide[] = [
        { id: "sg_1", display_name: "Main", is_default: true, enabled: true },
        { id: "sg_2", display_name: "Disabled SG", is_default: false, enabled: false },
        { id: "sg_3", display_name: "Marketing", is_default: false, enabled: true },
      ];
      const mockCall = vi.fn().mockResolvedValue({ statusCode: 200, body: apiStyleGuides });
      const ctx = createMockContext(mockCall);

      const result = await listStyleGuides.call(ctx);

      expect(result.map((sg) => sg.id)).toEqual(["sg_1", "sg_3"]);
    });

    it("calls the style-guides endpoint", async () => {
      const mockCall = vi.fn().mockResolvedValue({ statusCode: 200, body: [] });
      const ctx = createMockContext(mockCall);

      await listStyleGuides.call(ctx);

      expect(mockCall).toHaveBeenCalledWith(
        ctx,
        "markupaiApi",
        expect.objectContaining({
          method: "GET",
          url: "https://api.markup.ai/style-agent/style-guides",
        }),
      );
    });

    it("returns empty array when API returns null body", async () => {
      const mockCall = vi.fn().mockResolvedValue({ statusCode: 200, body: null });
      const ctx = createMockContext(mockCall);

      const result = await listStyleGuides.call(ctx);

      expect(result).toEqual([]);
    });

    it("throws a NodeApiError on non-200 status", async () => {
      const mockCall = vi
        .fn()
        .mockResolvedValue({ statusCode: 403, body: { detail: "forbidden" } });
      const ctx = createMockContext(mockCall);

      const promise = listStyleGuides.call(ctx);
      await expect(promise).rejects.toBeInstanceOf(NodeApiError);
      await expect(promise).rejects.toMatchObject({ httpCode: "403" });
    });
  });
});
