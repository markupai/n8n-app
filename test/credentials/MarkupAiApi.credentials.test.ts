import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MarkupAiApi } from "../../credentials/MarkupAiApi.credentials";
import { getBaseUrlString } from "../../utils/common.utils";

describe("MarkupAiApi credentials", () => {
  describe("MarkupAiApi class", () => {
    let credentials: MarkupAiApi;

    beforeEach(() => {
      credentials = new MarkupAiApi();
      // Clear environment variables before each test
      delete process.env.MARKUP_AI_BASE_URL;
    });

    afterEach(() => {
      // Clean up environment variables after each test
      delete process.env.MARKUP_AI_BASE_URL;
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
          },
        },
      };

      expect(credentials.authenticate).toEqual(expected);
    });

    it("should have correct test request object with production URL by default", () => {
      const expected = {
        request: {
          baseURL: "https://api.markup.ai/",
          url: "/v1/internal/constants",
        },
      };

      expect(credentials.test).toEqual(expected);
      // Verify it uses the shared function
      expect(credentials.test.request.baseURL).toBe(getBaseUrlString());
    });

    it("should use custom URL from MARKUP_AI_BASE_URL environment variable", () => {
      process.env.MARKUP_AI_BASE_URL = "https://api.dev.markup.ai/";
      // Create a new instance to pick up the environment variable
      const credentialsWithCustomUrl = new MarkupAiApi();

      expect(credentialsWithCustomUrl.test.request.baseURL).toBe("https://api.dev.markup.ai/");
      // Verify it uses the shared function
      expect(credentialsWithCustomUrl.test.request.baseURL).toBe(getBaseUrlString());
    });
  });
});
