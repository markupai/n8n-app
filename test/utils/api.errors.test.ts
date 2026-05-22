import { describe, it, expect } from "vitest";
import { NodeApiError } from "n8n-workflow";
import type { INode } from "n8n-workflow";
import { assertOk, buildNodeApiError } from "../../nodes/Markupai/utils/api.errors";

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

const REQUEST = { method: "GET", url: "https://api.markup.ai/agents" };

describe("api.errors", () => {
  describe("buildNodeApiError", () => {
    it("wraps an object body and exposes httpCode + description", () => {
      const err = buildNodeApiError(
        stubNode(),
        { statusCode: 400, body: { detail: "Bad payload" } },
        REQUEST,
      );

      expect(err).toBeInstanceOf(NodeApiError);
      expect(err.httpCode).toBe("400");
      // description carries the request body JSON so the n8n UI can show it
      expect(err.description).toContain("Bad payload");
    });

    it("handles a string body", () => {
      const err = buildNodeApiError(stubNode(), { statusCode: 502, body: "Bad Gateway" }, REQUEST);

      expect(err.httpCode).toBe("502");
      expect(err.description).toBe("Bad Gateway");
    });

    it("handles a null body without throwing", () => {
      const err = buildNodeApiError(stubNode(), { statusCode: 500, body: null }, REQUEST);

      expect(err.httpCode).toBe("500");
      // describeBody returns undefined for null; NodeApiError may store it as null internally
      expect(err.description ?? null).toBeNull();
    });

    it("handles a numeric body by coercing to string", () => {
      const err = buildNodeApiError(stubNode(), { statusCode: 503, body: 42 }, REQUEST);

      expect(err.httpCode).toBe("503");
      expect(err.description).toBe("42");
    });
  });

  describe("assertOk", () => {
    it("returns silently on 200", () => {
      expect(() => {
        assertOk(stubNode(), { statusCode: 200, body: { ok: true } }, REQUEST);
      }).not.toThrow();
    });

    it("throws a NodeApiError on any non-200 status", () => {
      let thrown: unknown;
      try {
        assertOk(stubNode(), { statusCode: 403, body: { detail: "forbidden" } }, REQUEST);
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(NodeApiError);
      expect((thrown as NodeApiError).httpCode).toBe("403");
    });

    it("treats 201 / 204 / other 2xx as failures (only 200 is OK)", () => {
      // Several of our load endpoints only ever expect 200; a 2xx that isn't 200
      // signals an unexpected response shape we shouldn't silently accept.
      expect(() => {
        assertOk(stubNode(), { statusCode: 204, body: null }, REQUEST);
      }).toThrow(NodeApiError);
    });
  });
});
