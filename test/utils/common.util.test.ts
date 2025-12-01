import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBaseUrlString } from "../../utils/common.utils";

describe("base-url.utils", () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.MARKUP_AI_BASE_URL;
  });

  afterEach(() => {
    // Clean up environment variables after each test
    delete process.env.MARKUP_AI_BASE_URL;
  });

  describe("getBaseUrlString", () => {
    it("returns production URL by default", () => {
      const result = getBaseUrlString();

      expect(result).toBe("https://api.markup.ai/");
    });

    it("returns production URL when MARKUP_AI_BASE_URL is not set", () => {
      delete process.env.MARKUP_AI_BASE_URL;

      const result = getBaseUrlString();

      expect(result).toBe("https://api.markup.ai/");
    });

    it("returns custom URL from MARKUP_AI_BASE_URL environment variable", () => {
      process.env.MARKUP_AI_BASE_URL = "https://api.dev.markup.ai/";

      const result = getBaseUrlString();

      expect(result).toBe("https://api.dev.markup.ai/");
    });

    it("returns custom URL even if it's different from production", () => {
      process.env.MARKUP_AI_BASE_URL = "https://custom.api.markup.ai/";

      const result = getBaseUrlString();

      expect(result).toBe("https://custom.api.markup.ai/");
    });

    it("handles URLs with trailing slashes", () => {
      process.env.MARKUP_AI_BASE_URL = "https://api.dev.markup.ai/";

      const result = getBaseUrlString();

      expect(result).toBe("https://api.dev.markup.ai/");
    });

    it("handles URLs without trailing slashes", () => {
      process.env.MARKUP_AI_BASE_URL = "https://api.dev.markup.ai/";

      const result = getBaseUrlString();

      expect(result).toBe("https://api.dev.markup.ai/");
    });

    it("returns production URL if MARKUP_AI_BASE_URL is set to empty string", () => {
      process.env.MARKUP_AI_BASE_URL = "";

      const result = getBaseUrlString();

      expect(result).toBe("https://api.markup.ai/");
    });

    it("returns production URL if MARKUP_AI_BASE_URL is set to whitespace only", () => {
      process.env.MARKUP_AI_BASE_URL = "   ";

      const result = getBaseUrlString();

      expect(result).toBe("https://api.markup.ai/");
    });
  });
});
