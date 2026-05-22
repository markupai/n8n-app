import { describe, it, expect, beforeEach } from "vitest";
import { MarkupAiApi } from "../../credentials/MarkupAiApi.credentials";
import { getBaseUrlString } from "../../utils/common.utils";

describe("MarkupAiApi credentials", () => {
  describe("MarkupAiApi class", () => {
    let credentials: MarkupAiApi;

    beforeEach(() => {
      credentials = new MarkupAiApi();
    });

    it("should have correct basic properties", () => {
      const expected = {
        name: "markupaiApi",
        displayName: "Markup AI API",
        documentationUrl: "https://docs.markup.ai/",
      };

      expect({
        name: credentials.name,
        displayName: credentials.displayName,
        documentationUrl: credentials.documentationUrl,
      }).toEqual(expected);
    });

    it("should have correct properties array", () => {
      const expected = [
        {
          displayName: "Markup AI API Key",
          name: "apiKey",
          type: "string",
          typeOptions: { password: true },
          default: "",
          required: true,
        },
      ];

      expect(credentials.properties).toEqual(expected);
    });

    it("should have correct authenticate object", () => {
      const expected = {
        type: "generic",
        properties: {
          headers: {
            Authorization: "=Bearer {{$credentials.apiKey}}",
            "x-integration-id": "markupai-n8n-app",
          },
        },
      };

      expect(credentials.authenticate).toEqual(expected);
    });

    it("should have correct test request object with production URL", () => {
      const expected = {
        request: {
          baseURL: "https://api.markup.ai/",
          url: "/agents",
          qs: { page: 1, page_size: 1 },
        },
      };

      expect(credentials.test).toEqual(expected);
      expect(credentials.test.request.baseURL).toBe(getBaseUrlString());
    });
  });
});
