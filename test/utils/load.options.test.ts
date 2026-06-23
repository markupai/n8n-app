import { describe, it, expect, vi } from "vitest";
import { NodeApiError } from "n8n-workflow";
import type { ILoadOptionsFunctions, INode } from "n8n-workflow";
import {
  getBaseUrl,
  loadAgents,
  loadStyleGuides,
  loadTerminologyDomains,
} from "../../nodes/Markupai/utils/load.options";

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

function createMockLoadOptionsFunctions(mock: {
  getCredentials: ReturnType<typeof vi.fn>;
  helpers: {
    httpRequestWithAuthentication: {
      call: ReturnType<typeof vi.fn>;
    };
  };
}): ILoadOptionsFunctions {
  return {
    ...mock,
    getNode: () => stubNode(),
  } as unknown as ILoadOptionsFunctions;
}

describe("load.options", () => {
  describe("getBaseUrl", () => {
    it("returns production URL", () => {
      const result = getBaseUrl();
      expect(result.toString()).toBe("https://api.markup.ai/");
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

    it("calls agents endpoint with the production base URL", async () => {
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
          url: "https://api.markup.ai/agents",
        }),
      );
    });

    it("throws a NodeApiError when the API returns an error status", async () => {
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

      const promise = loadAgents.call(loadOptionsFunction);
      await expect(promise).rejects.toBeInstanceOf(NodeApiError);
      await expect(promise).rejects.toMatchObject({ httpCode: "400" });
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

    it("calls terminology endpoint with the production base URL", async () => {
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
          url: "https://api.markup.ai/v1/terminology/domains",
        }),
      );
    });

    it("throws a NodeApiError when the terminology API returns an error status", async () => {
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

      const promise = loadTerminologyDomains.call(loadOptionsFunction);
      await expect(promise).rejects.toBeInstanceOf(NodeApiError);
      await expect(promise).rejects.toMatchObject({ httpCode: "400" });
    });
  });

  describe("loadStyleGuides", () => {
    const styleGuidesResponse = [
      { id: "sg_main", display_name: "Main", is_default: true, enabled: true },
      { id: "sg_marketing", display_name: "Marketing", is_default: false, enabled: true },
      { id: "sg_dev", display_name: "Dev", is_default: false, enabled: true },
      { id: "sg_disabled", display_name: "Disabled SG", is_default: false, enabled: false },
    ];

    it("returns enabled style guides with default first, then alphabetical", async () => {
      const loadOptionsFunction = createMockLoadOptionsFunctions({
        getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
        helpers: {
          httpRequestWithAuthentication: {
            call: vi.fn().mockResolvedValue({
              body: styleGuidesResponse,
              statusCode: 200,
            }),
          },
        },
      });

      const result = await loadStyleGuides.call(loadOptionsFunction);

      expect(result).toEqual([
        { name: "Main", value: "sg_main" },
        { name: "Dev", value: "sg_dev" },
        { name: "Marketing", value: "sg_marketing" },
      ]);
    });

    it("calls the style-guides endpoint with the production base URL", async () => {
      const mockCall = vi.fn().mockResolvedValue({
        body: styleGuidesResponse,
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

      await loadStyleGuides.call(loadOptionsFunction);

      expect(mockCall).toHaveBeenCalledWith(
        loadOptionsFunction,
        "markupaiApi",
        expect.objectContaining({
          url: "https://api.markup.ai/style-agent/style-guides",
        }),
      );
    });

    it("throws a NodeApiError when the style-guides API returns an error status", async () => {
      const loadOptionsFunction = createMockLoadOptionsFunctions({
        getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key" }),
        helpers: {
          httpRequestWithAuthentication: {
            call: vi.fn().mockResolvedValue({
              body: { detail: "forbidden" },
              statusCode: 403,
            }),
          },
        },
      });

      const promise = loadStyleGuides.call(loadOptionsFunction);
      await expect(promise).rejects.toBeInstanceOf(NodeApiError);
      await expect(promise).rejects.toMatchObject({ httpCode: "403" });
    });
  });
});
