import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IExecuteFunctions } from "n8n-workflow";
import { NodeApiError, NodeOperationError } from "n8n-workflow";
import { processMarkupaiItem } from "../../nodes/Markupai/utils/process.item";
import type {
  GetStyleRewriteResponse,
  PostStyleRewriteResponse,
} from "../../nodes/Markupai/Markupai.api.types";

vi.mock("../../nodes/Markupai/utils/style.api.utils", () => ({
  styleRequest: vi.fn(),
  getPath: vi.fn(),
}));

vi.mock("../../nodes/Markupai/utils/email.generator", () => ({
  generateEmailHTMLReport: vi.fn(),
}));

vi.mock("../../nodes/Markupai/utils/file.type.utils", () => ({
  getContentType: vi.fn(),
  getFileExtensionFromFileName: vi.fn(),
  getMimeTypeFromFileName: vi.fn(),
  getFileNameExtension: vi.fn(),
}));

vi.mock("n8n-workflow", async () => {
  const actual = await vi.importActual("n8n-workflow");
  return {
    ...actual,
    NodeApiError: class NodeApiError extends Error {
      description?: string;
      constructor(_: unknown, error: { message?: string; description?: string }) {
        super(error.message || "Node API Error");
        this.name = "NodeApiError";
        this.description = error.description || error.message;
      }
    },
    NodeOperationError: class NodeOperationError extends Error {
      description?: string;
      itemIndex?: number;
      constructor(
        node: unknown,
        error: { message?: string },
        options?: { description?: string; itemIndex?: number },
      ) {
        super(error.message || "Node Operation Error");
        this.name = "NodeOperationError";
        this.description = options?.description || error.message;
        this.itemIndex = options?.itemIndex;
      }
    },
  };
});

function createMockNode() {
  return {} as never;
}

const createGetStyleRewriteResponse = (
  overrides: Partial<GetStyleRewriteResponse> = {},
): GetStyleRewriteResponse => ({
  workflow: { id: "test-id", status: "completed" as const, api_version: "v1", type: "style" },
  config: {
    style_guide: { style_guide_id: "test-guide", style_guide_type: "custom" },
    dialect: "american_english",
    tone: "professional",
  },
  original: {
    issues: [],
    scores: {
      quality: {
        score: 85,
        grammar: { score: 85, issues: 0 },
        consistency: { score: 85, issues: 0 },
        terminology: { score: 85, issues: 0 },
      },
      analysis: {
        clarity: {
          score: 85,
          word_count: 100,
          sentence_count: 10,
          average_sentence_length: 10,
          flesch_reading_ease: 70,
          vocabulary_complexity: 5,
          sentence_complexity: 5,
        },
        tone: {
          score: 85,
          informality: 5,
          liveliness: 5,
          informality_alignment: 85,
          liveliness_alignment: 85,
        },
      },
    },
  },
  ...overrides,
});

const createPostStyleRewriteResponse = (
  overrides: Partial<PostStyleRewriteResponse> = {},
): PostStyleRewriteResponse => ({
  status: "running",
  workflow_id: "test-workflow-id",
  ...overrides,
});

const createMockExecuteFunctions = (
  overrides: Partial<IExecuteFunctions> = {},
): Partial<IExecuteFunctions> => ({
  getNodeParameter: vi.fn(),
  getNode: vi.fn().mockReturnValue({ name: "Markup AI" }),
  continueOnFail: vi.fn().mockReturnValue(false),
  ...overrides,
});

const createMockNodeParameterResponses = (
  operation: string,
  tone: string,
  additionalOptions: Record<string, unknown> = {},
) => {
  return vi
    .fn()
    .mockReturnValueOnce(operation)
    .mockReturnValueOnce(additionalOptions)
    .mockReturnValueOnce("test content")
    .mockReturnValueOnce("test-style-guide")
    .mockReturnValueOnce(tone)
    .mockReturnValueOnce("american_english");
};

describe("process.item", () => {
  let mockStyleRequest: ReturnType<typeof vi.fn>;
  let mockGenerateEmailHTMLReport: ReturnType<typeof vi.fn>;
  let mockGetPath: ReturnType<typeof vi.fn>;
  let mockGetContentType: ReturnType<typeof vi.fn>;
  let mockGetFileExtensionFromFileName: ReturnType<typeof vi.fn>;
  let mockGetMimeTypeFromFileName: ReturnType<typeof vi.fn>;
  let mockGetFileNameExtension: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { styleRequest } = await import("../../nodes/Markupai/utils/style.api.utils");
    const { generateEmailHTMLReport } = await import("../../nodes/Markupai/utils/email.generator");
    const { getPath } = await import("../../nodes/Markupai/utils/style.api.utils");
    const {
      getContentType,
      getFileExtensionFromFileName,
      getMimeTypeFromFileName,
      getFileNameExtension,
    } = await import("../../nodes/Markupai/utils/file.type.utils");

    mockStyleRequest = vi.fn();
    mockGenerateEmailHTMLReport = vi.fn().mockReturnValue("<html>test report</html>");
    mockGetPath = vi.fn().mockReturnValue("v1/style/checks");
    mockGetContentType = vi.fn().mockReturnValue("text/plain");
    mockGetFileExtensionFromFileName = vi.fn().mockReturnValue(".txt");
    mockGetMimeTypeFromFileName = vi.fn().mockReturnValue("text/plain");
    mockGetFileNameExtension = vi.fn().mockReturnValue(".txt");

    vi.mocked(styleRequest).mockImplementation(mockStyleRequest as unknown as typeof styleRequest);
    vi.mocked(generateEmailHTMLReport).mockImplementation(
      mockGenerateEmailHTMLReport as unknown as typeof generateEmailHTMLReport,
    );
    vi.mocked(getPath).mockImplementation(mockGetPath as unknown as typeof getPath);
    vi.mocked(getContentType).mockImplementation(
      mockGetContentType as unknown as typeof getContentType,
    );
    vi.mocked(getFileExtensionFromFileName).mockImplementation(
      mockGetFileExtensionFromFileName as unknown as typeof getFileExtensionFromFileName,
    );
    vi.mocked(getMimeTypeFromFileName).mockImplementation(
      mockGetMimeTypeFromFileName as unknown as typeof getMimeTypeFromFileName,
    );
    vi.mocked(getFileNameExtension).mockImplementation(
      mockGetFileNameExtension as unknown as typeof getFileNameExtension,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("processMarkupaiItem", () => {
    describe("Success scenarios", () => {
      it("should process item successfully with waitForCompletion true", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);
        mockGetMimeTypeFromFileName.mockReturnValue("text/plain");

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
            documentName: "test.txt",
            documentOwner: "test-owner",
            documentLink: "https://test.com",
          }),
        });

        const result = await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockStyleRequest).toHaveBeenCalledWith(
          {
            content: "test content",
            contentType: "text/plain",
            fileNameExtension: ".txt",
            styleGuide: "test-style-guide",
            tone: "professional",
            dialect: "american_english",
            waitForCompletion: true,
            pollingTimeout: 60_000,
          },
          "v1/style/checks",
          0,
        );

        expect(mockGenerateEmailHTMLReport).toHaveBeenCalledWith(mockResponse, {
          document_name: "test.txt",
          document_owner: "test-owner",
          document_link: "https://test.com",
        });

        expect(result).toEqual({
          json: {
            ...mockResponse,
            html_email: "<html>test report</html>",
          },
          pairedItem: { item: 0 },
        });
      });

      it("should process item successfully with waitForCompletion false", async () => {
        const mockResponse = createPostStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: false,
          }),
        });

        const result = await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockStyleRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            waitForCompletion: false,
          }),
          "v1/style/checks",
          0,
        );

        expect(mockGenerateEmailHTMLReport).not.toHaveBeenCalled();

        expect(result).toEqual({
          json: mockResponse,
          pairedItem: { item: 0 },
        });
      });

      it("should handle styleRewrite operation correctly", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);
        mockGetPath.mockReturnValue("v1/style/rewrites");

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleRewrite", "casual", {
            waitForCompletion: true,
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockGetPath).toHaveBeenCalledWith("styleRewrite");
        expect(mockStyleRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            tone: "casual",
          }),
          "v1/style/rewrites",
          0,
        );
      });

      it("should exclude tone when None", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "None", {
            waitForCompletion: true,
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        const callArgs = mockStyleRequest.mock.calls[0];
        expect(callArgs[0]).not.toHaveProperty("tone");
        expect(callArgs[1]).toBe("v1/style/checks");
        expect(callArgs[2]).toBe(0);
      });

      it("should use custom pollingTimeout when provided", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
            pollingTimeout: 30_000,
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockStyleRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            pollingTimeout: 30_000,
          }),
          "v1/style/checks",
          0,
        );
      });

      it("should use default pollingTimeout when not provided", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockStyleRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            pollingTimeout: 60_000,
          }),
          "v1/style/checks",
          0,
        );
      });

      it("should use default waitForCompletion when not provided", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {}),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockStyleRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            waitForCompletion: true,
          }),
          "v1/style/checks",
          0,
        );
      });

      it("should handle item with different index", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
          }),
        });

        const result = await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 2);

        expect(mockStyleRequest).toHaveBeenCalledWith(expect.anything(), "v1/style/checks", 2);

        expect(result.pairedItem).toEqual({ item: 2 });
      });

      it("should use getMimeTypeFromFileName when documentName is provided", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);
        mockGetMimeTypeFromFileName.mockReturnValue("application/dita+xml");
        mockGetFileNameExtension.mockReturnValue(".dita");

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
            documentName: "document.dita",
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockGetMimeTypeFromFileName).toHaveBeenCalledWith("document.dita");
        expect(mockGetContentType).not.toHaveBeenCalled();
        expect(mockGetFileNameExtension).toHaveBeenCalledWith("application/dita+xml");
      });

      it("should use getContentType when documentName is not provided", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);
        mockGetContentType.mockReturnValue("text/html");
        mockGetFileNameExtension.mockReturnValue(".html");

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
            // documentName is not provided
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockGetContentType).toHaveBeenCalledWith("test content");
        expect(mockGetFileExtensionFromFileName).not.toHaveBeenCalled();
        expect(mockGetFileNameExtension).toHaveBeenCalledWith("text/html");
      });

      it("should use getContentType when documentName is undefined", async () => {
        const mockResponse = createGetStyleRewriteResponse();
        mockStyleRequest.mockResolvedValue([{ json: mockResponse }]);
        mockGetContentType.mockReturnValue("application/dita+xml");
        mockGetFileNameExtension.mockReturnValue(".dita");

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
            documentName: undefined,
          }),
        });

        await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(mockGetContentType).toHaveBeenCalledWith("test content");
        expect(mockGetFileExtensionFromFileName).not.toHaveBeenCalled();
        expect(mockGetFileNameExtension).toHaveBeenCalledWith("application/dita+xml");
      });
    });

    describe("Error handling", () => {
      it("should return error data when continueOnFail is true", async () => {
        const error = new Error("API request failed");
        mockStyleRequest.mockRejectedValue(error);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
          }),
          continueOnFail: vi.fn().mockReturnValue(true),
        });

        const result = await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(result).toEqual({
          json: {
            error: "API request failed",
          },
          pairedItem: { item: 0 },
        });

        expect(mockGenerateEmailHTMLReport).not.toHaveBeenCalled();
      });

      it("should return NodeApiError description when continueOnFail is true", async () => {
        const nodeApiError = new NodeApiError(createMockNode(), {
          message: "API Error",
          description: "Custom error description",
        });
        mockStyleRequest.mockRejectedValue(nodeApiError);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
          }),
          continueOnFail: vi.fn().mockReturnValue(true),
        });

        const result = await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(result.json).toHaveProperty("error", "Custom error description");
      });

      it("should throw NodeOperationError when continueOnFail is false", async () => {
        const error = new Error("API request failed");
        mockStyleRequest.mockRejectedValue(error);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
          }),
          continueOnFail: vi.fn().mockReturnValue(false),
        });

        await expect(
          processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0),
        ).rejects.toThrow(NodeOperationError);

        expect(mockGenerateEmailHTMLReport).not.toHaveBeenCalled();
      });

      it("should include error description and itemIndex in NodeOperationError", async () => {
        const nodeApiError = new NodeApiError(createMockNode(), {
          message: "API Error",
          description: "Custom error description",
        });
        mockStyleRequest.mockRejectedValue(nodeApiError);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
          }),
          continueOnFail: vi.fn().mockReturnValue(false),
        });

        try {
          await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 3);
          expect.fail("Should have thrown NodeOperationError");
        } catch (error) {
          expect(error).toBeInstanceOf(NodeOperationError);
          if (error instanceof NodeOperationError) {
            expect(error.description).toBe("Custom error description");
            expect((error as { itemIndex?: number }).itemIndex).toBe(3);
          }
        }
      });

      it("should handle error with message when description is not available", async () => {
        const error = new Error("Simple error message");
        mockStyleRequest.mockRejectedValue(error);

        const mockExecuteFunctions = createMockExecuteFunctions({
          getNodeParameter: createMockNodeParameterResponses("styleCheck", "professional", {
            waitForCompletion: true,
          }),
          continueOnFail: vi.fn().mockReturnValue(true),
        });

        const result = await processMarkupaiItem.call(mockExecuteFunctions as IExecuteFunctions, 0);

        expect(result.json).toHaveProperty("error", "Simple error message");
      });
    });
  });
});
