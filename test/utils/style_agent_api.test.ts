import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ILoadOptionsFunctions } from "n8n-workflow";
import {
  assertStyleAgentEnabled,
  getStyleAgentConfig,
  listStyleAgentTargets,
  STYLE_AGENT_DISABLED_MESSAGE,
} from "../../nodes/Markupai/utils/style_agent_api";
import type {
  OrganizationConfigResponse,
  StyleAgentTarget,
} from "../../nodes/Markupai/Markupai.api.types";

function createMockContext(mockCall: ReturnType<typeof vi.fn>): ILoadOptionsFunctions {
  return {
    getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
    helpers: {
      httpRequestWithAuthentication: {
        call: mockCall,
      },
    },
  } as unknown as ILoadOptionsFunctions;
}

describe("style_agent_api", () => {
  beforeEach(() => {
    delete process.env.MARKUP_AI_BASE_URL;
  });

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

    it("throws on non-200 status", async () => {
      const mockCall = vi
        .fn()
        .mockResolvedValue({ statusCode: 500, body: { detail: "server boom" } });
      const ctx = createMockContext(mockCall);

      await expect(getStyleAgentConfig.call(ctx)).rejects.toThrow(
        "Error loading style agent config",
      );
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

  describe("listStyleAgentTargets", () => {
    it("returns only enabled targets, parsed as an array", async () => {
      const apiTargets: StyleAgentTarget[] = [
        { id: "tgt_1", display_name: "Main", is_default: true, enabled: true },
        { id: "tgt_2", display_name: "Disabled SG", is_default: false, enabled: false },
        { id: "tgt_3", display_name: "Marketing", is_default: false, enabled: true },
      ];
      const mockCall = vi.fn().mockResolvedValue({ statusCode: 200, body: apiTargets });
      const ctx = createMockContext(mockCall);

      const result = await listStyleAgentTargets.call(ctx);

      expect(result.map((t) => t.id)).toEqual(["tgt_1", "tgt_3"]);
    });

    it("returns empty array when API returns null body", async () => {
      const mockCall = vi.fn().mockResolvedValue({ statusCode: 200, body: null });
      const ctx = createMockContext(mockCall);

      const result = await listStyleAgentTargets.call(ctx);

      expect(result).toEqual([]);
    });

    it("throws on non-200 status", async () => {
      const mockCall = vi
        .fn()
        .mockResolvedValue({ statusCode: 403, body: { detail: "forbidden" } });
      const ctx = createMockContext(mockCall);

      await expect(listStyleAgentTargets.call(ctx)).rejects.toThrow(
        "Error loading style agent targets",
      );
    });
  });
});
