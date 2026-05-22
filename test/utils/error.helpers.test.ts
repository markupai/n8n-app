import { describe, it, expect } from "vitest";
import { NodeApiError } from "n8n-workflow";
import type { INode } from "n8n-workflow";
import {
  createErrorResponse,
  getErrorDescription,
  getErrorMessage,
} from "../../nodes/Markupai/utils/error.helpers";

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

describe("error.helpers", () => {
  describe("getErrorMessage", () => {
    it("prefers NodeApiError description when present", () => {
      const err = new NodeApiError(
        stubNode(),
        { detail: "request body invalid" },
        { message: "Generic 400 message", description: "request body invalid" },
      );
      expect(getErrorMessage(err)).toBe("request body invalid");
    });

    it("falls back to NodeApiError message when description is empty", () => {
      const err = new NodeApiError(stubNode(), {}, { message: "Generic 400 message" });
      err.description = undefined;
      expect(getErrorMessage(err)).toBe("Generic 400 message");
    });

    it("returns plain Error.message for non-NodeApiError errors", () => {
      expect(getErrorMessage(new Error("Network down"))).toBe("Network down");
    });

    it("coerces non-Error values to string", () => {
      expect(getErrorMessage("plain string")).toBe("plain string");
      expect(getErrorMessage(42)).toBe("42");
      expect(getErrorMessage(undefined)).toBe("undefined");
    });
  });

  describe("getErrorDescription", () => {
    it("returns NodeApiError.description when set", () => {
      const err = new NodeApiError(
        stubNode(),
        { detail: "Bad payload" },
        { message: "Failed", description: "Bad payload" },
      );
      expect(getErrorDescription(err)).toBe("Bad payload");
    });

    it("returns undefined when NodeApiError has no description", () => {
      const err = new NodeApiError(stubNode(), {}, { message: "Failed" });
      err.description = undefined;
      expect(getErrorDescription(err)).toBeUndefined();
    });

    it("returns plain Error.message for non-NodeApiError errors", () => {
      expect(getErrorDescription(new Error("oops"))).toBe("oops");
    });

    it("coerces non-Error values to string", () => {
      expect(getErrorDescription({ foo: 1 })).toBe("[object Object]");
    });
  });

  describe("createErrorResponse", () => {
    it("returns a json item with the error message and the matching pairedItem", () => {
      const item = createErrorResponse(new Error("boom"), 3);
      expect(item).toEqual({
        json: { error: "boom" },
        pairedItem: { item: 3 },
      });
    });
  });
});
