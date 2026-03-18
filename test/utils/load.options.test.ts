import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ILoadOptionsFunctions } from "n8n-workflow";
import {
  getBaseUrl,
  loadAgents,
  loadTerminologyDomains,
} from "../../nodes/Markupai/utils/load.options";

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
        {
          id: "ag_vYCPHsSQnnJj",
          name: "style_agent",
          description: "Checks document style guidance",
        },
        { id: "ag_1", name: "terminology", description: "Checks terminology" },
        { id: "ag_2", name: "content_analysis", description: "Full content analysis" },
        { id: "ag_cnct5nkhtfNk", name: "parallel_executor", description: "Internal orchestrator" },
        {
          id: "ag__48WjfPsyKCX",
          name: "content_analysis_orchestrator",
          description: "Internal orchestrator",
        },
      ],
      total: 5,
      page: 1,
      page_size: 100,
      total_pages: 1,
    };

    it("returns only style_agent from the API as options", async () => {
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
        {
          name: "style_agent",
          value: "ag_vYCPHsSQnnJj",
          description: "Checks document style guidance",
        },
      ]);
    });

    it("joins agents URL correctly when base URL includes a path without trailing slash", async () => {
      process.env.MARKUP_AI_BASE_URL = "https://api.dev.markup.ai/api";

      const mockCall = vi.fn().mockResolvedValue({
        body: agentsResponse,
        statusCode: 200,
      });

      const loadOptionsFunction = createMockLoadOptionsFunctions({
        getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
        helpers: {
          httpRequestWithAuthentication: {
            call: mockCall,
          },
        },
      });

      await loadAgents.call(loadOptionsFunction);

      expect(mockCall).toHaveBeenCalledWith(
        loadOptionsFunction,
        "markupaiApi",
        expect.objectContaining({
          url: "https://api.dev.markup.ai/api/agents",
        }),
      );
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

      await expect(loadAgents.call(loadOptionsFunction)).rejects.toThrow("Error loading agents");
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

  describe("loadTerminologyDomains", () => {
    const domainsPage1 = {
      domains: [
        { id: "d_1", name: "Marketing" },
        { id: "d_2", name: "Legal" },
      ],
      total_count: 3,
      page: 1,
      page_size: 20,
      total_pages: 2,
    };
    const domainsPage2 = {
      domains: [
        { id: "d_2", name: "Legal" },
        { id: "d_3", name: "Product" },
      ],
      total_count: 3,
      page: 2,
      page_size: 20,
      total_pages: 2,
    };

    it("fetches all pages and returns deduplicated domain options", async () => {
      const mockCall = vi
        .fn()
        .mockResolvedValueOnce({
          body: domainsPage1,
          statusCode: 200,
        })
        .mockResolvedValueOnce({
          body: domainsPage2,
          statusCode: 200,
        });

      const loadOptionsFunction = createMockLoadOptionsFunctions({
        getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
        helpers: {
          httpRequestWithAuthentication: {
            call: mockCall,
          },
        },
      });

      const result = await loadTerminologyDomains.call(loadOptionsFunction);

      expect(mockCall).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { name: "Legal", value: "d_2" },
        { name: "Marketing", value: "d_1" },
        { name: "Product", value: "d_3" },
      ]);
    });

    it("joins terminology URL correctly when base URL includes a path without trailing slash", async () => {
      process.env.MARKUP_AI_BASE_URL = "https://api.dev.markup.ai/api";

      const mockCall = vi.fn().mockResolvedValue({
        body: domainsPage1,
        statusCode: 200,
      });

      const loadOptionsFunction = createMockLoadOptionsFunctions({
        getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
        helpers: {
          httpRequestWithAuthentication: {
            call: mockCall,
          },
        },
      });

      await loadTerminologyDomains.call(loadOptionsFunction);

      expect(mockCall).toHaveBeenCalledWith(
        loadOptionsFunction,
        "markupaiApi",
        expect.objectContaining({
          url: "https://api.dev.markup.ai/api/v1/terminology/domains",
        }),
      );
    });

    it("throws if the terminology API returns an error status", async () => {
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

      await expect(loadTerminologyDomains.call(loadOptionsFunction)).rejects.toThrow(
        "Error loading terminology domains",
      );
    });
  });
});
