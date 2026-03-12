import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ILoadOptionsFunctions } from "n8n-workflow";
import { getBaseUrl, loadAgents } from "../../nodes/Markupai/utils/load.options";

function createMockLoadOptionsFunctions(mock: {
  getCredentials: ReturnType<typeof vi.fn>;
  helpers: {
    httpRequestWithAuthentication: {
      call: ReturnType<typeof vi.fn>;
    };
  };
}): ILoadOptionsFunctions {
  return mock as unknown as ILoadOptionsFunctions;
}

describe("load.options", () => {
  beforeEach(() => {
    delete process.env.MARKUP_AI_BASE_URL;
  });

  describe("getBaseUrl", () => {
    it("returns production URL by default", () => {
      const result = getBaseUrl();
      expect(result.toString()).toBe("https://api.markup.ai/");
    });

    it("returns custom URL from MARKUP_AI_BASE_URL environment variable", () => {
      process.env.MARKUP_AI_BASE_URL = "https://api.dev.markup.ai/";
      const result = getBaseUrl();
      expect(result.toString()).toBe("https://api.dev.markup.ai/");
    });

    it("returns custom URL from MARKUP_AI_BASE_URL with trailing slash", () => {
      process.env.MARKUP_AI_BASE_URL = "https://custom.api.markup.ai/";
      const result = getBaseUrl();
      expect(result.toString()).toBe("https://custom.api.markup.ai/");
    });
  });

  describe("loadAgents", () => {
    const agentsResponse = {
      agents: [
        { id: "ag_1", name: "terminology", description: "Checks terminology" },
        { id: "ag_2", name: "content_analysis", description: "Full content analysis" },
      ],
      total: 2,
      page: 1,
      page_size: 100,
      total_pages: 1,
    };

    it("returns agents from the API as options", async () => {
      const loadOptionsFunction = createMockLoadOptionsFunctions({
        getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
        helpers: {
          httpRequestWithAuthentication: {
            call: vi.fn().mockResolvedValue({
              body: agentsResponse,
              statusCode: 200,
            }),
          },
        },
      });

      const result = await loadAgents.call(loadOptionsFunction);

      expect(result).toEqual([
        { name: "terminology", value: "ag_1", description: "Checks terminology" },
        { name: "content_analysis", value: "ag_2", description: "Full content analysis" },
      ]);
    });

    it("throws if the API returns an error status", async () => {
      const loadOptionsFunction = createMockLoadOptionsFunctions({
        getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
        helpers: {
          httpRequestWithAuthentication: {
            call: vi.fn().mockResolvedValue({
              body: { error: "Bad Request" },
              statusCode: 400,
            }),
          },
        },
      });

      await expect(loadAgents.call(loadOptionsFunction)).rejects.toThrow(
        "Error loading agents",
      );
    });

    it("throws if the request fails", async () => {
      const loadOptionsFunction = createMockLoadOptionsFunctions({
        getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
        helpers: {
          httpRequestWithAuthentication: {
            call: vi.fn().mockRejectedValue(new Error("Network error")),
          },
        },
      });

      await expect(loadAgents.call(loadOptionsFunction)).rejects.toThrow();
    });
  });
});
