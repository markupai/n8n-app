import { describe, it, expect } from "vitest";
import { getBaseUrlString, MARKUP_AI_BASE_URL } from "../../utils/common.utils";

describe("base-url.utils", () => {
  describe("getBaseUrlString", () => {
    it("returns the production URL", () => {
      expect(getBaseUrlString()).toBe("https://api.markup.ai/");
    });

    it("matches the exported MARKUP_AI_BASE_URL constant", () => {
      expect(getBaseUrlString()).toBe(MARKUP_AI_BASE_URL);
    });
  });
});
