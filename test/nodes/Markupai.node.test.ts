import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	IExecuteFunctions,
	INodeCredentialDescription,
	INodeExecutionData,
	INodePropertyTypeOptions,
} from "n8n-workflow";
import { Markupai } from "../../nodes/Markupai/Markupai.node";

vi.mock("n8n-workflow", async () => {
	const actual = await vi.importActual("n8n-workflow");
	return {
		...actual,
		NodeConnectionTypes: {
			Main: "main",
		},
		NodeApiError: class NodeApiError extends Error {
			constructor(_: any, error: any) {
				super(error.message || "Node API Error");
				this.name = "NodeApiError";
			}
		},
	};
});

vi.mock("../../nodes/Markupai/utils/load.options", () => ({
	loadStyleGuides: vi.fn(),
	loadTones: vi.fn(),
	loadDialects: vi.fn(),
}));

vi.mock("../../nodes/Markupai/utils/style.api.utils", () => ({
	styleRequest: vi.fn(),
	getPath: vi.fn(),
}));

vi.mock("../../nodes/Markupai/utils/email.generator", () => ({
	generateEmailHTMLReport: vi.fn(),
}));

const createCheckWorkflowResponse = () => ({
	workflow: { id: "test-id", status: "completed" },
	config: { style_guide: { style_guide_id: "test-guide" } },
	original: { issues: [], scores: { quality: { score: 85 } } },
});

const validateFirstItem = (firstElement: INodeExecutionData, firstItemError: Error) => {
	expect(firstElement.json).toHaveProperty("error", firstItemError.message);
	expect(firstElement.pairedItem).toEqual({ item: 0 });
};

const validateSecondItem = (
	secondElement: INodeExecutionData,
	secondItemResult: {
		workflow: { id: string; status: string };
		config: { style_guide: { style_guide_id: string } };
		original: { issues: any[]; scores: { quality: { score: number } } };
	},
) => {
	expect(secondElement.json).toMatchObject({
		...secondItemResult,
		html_email: "<html>test report</html>",
	});
	expect(secondElement.pairedItem).toEqual({ item: 1 });
};

describe("Markupai", () => {
	let markupai: Markupai;
	let mockExecuteFunctions: Partial<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
		markupai = new Markupai();

		mockExecuteFunctions = {
			getInputData: vi.fn(),
			getNodeParameter: vi.fn(),
			helpers: {
				createDeferredPromise: vi.fn(),
				returnJsonArray: vi.fn(),
			} as any,
			getNode: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Node Description", () => {
		it("should have correct basic properties", () => {
			expect(markupai.description.displayName).toBe("Markup AI");
			expect(markupai.description.name).toBe("markupai");
			expect(markupai.description.description).toBe("Markup AI Content Checker");
			expect(markupai.description.icon).toBe("file:markupai.svg");
			expect(markupai.description.version).toBe(1);
		});

		it("should have correct default name", () => {
			expect(markupai.description.defaults.name).toBe("Markup AI");
		});

		it("should have correct inputs and outputs", () => {
			expect(markupai.description.inputs).toHaveLength(1);
			expect(markupai.description.outputs).toHaveLength(1);
		});

		it("should have correct credentials configuration", () => {
			const credentials = markupai.description.credentials as INodeCredentialDescription[];

			expect(credentials).toHaveLength(1);
			expect(credentials[0].name).toBe("markupaiApi");
			expect(credentials[0].required).toBe(true);
		});

		it("should have correct properties structure", () => {
			const properties = markupai.description.properties;

			const resourceProp = properties.find((p) => p.name === "resource");
			expect(resourceProp?.type).toBe("options");
			expect(resourceProp?.default).toBe("content");

			const operationProp = properties.find((p) => p.name === "operation");
			expect(operationProp?.type).toBe("options");
			expect(operationProp?.default).toBe("styleCheck");

			const contentProp = properties.find((p) => p.name === "content");
			expect(contentProp?.type).toBe("string");
			expect(contentProp?.required).toBe(true);

			const styleGuideProp = properties.find((p) => p.name === "styleGuide");
			expect(styleGuideProp?.type).toBe("options");
			expect(styleGuideProp?.typeOptions?.loadOptionsMethod).toBe("loadStyleGuides");

			const toneProp = properties.find((p) => p.name === "tone");
			expect(toneProp?.type).toBe("options");
			expect(toneProp?.default).toBe("None (Keep Tone Unchanged)");
			expect(toneProp?.typeOptions?.loadOptionsMethod).toBe("loadTones");

			const dialectProp = properties.find((p) => p.name === "dialect");
			expect(dialectProp?.type).toBe("options");
			expect(dialectProp?.typeOptions?.loadOptionsMethod).toBe("loadDialects");
		});

		it("should have correct additional options structure", () => {
			const additionalOptionsProp = markupai.description.properties.find(
				(p) => p.name === "additionalOptions",
			);
			expect(additionalOptionsProp?.type).toBe("collection");

			const options = additionalOptionsProp?.options;

			const documentLinkOption = options?.find(
				(o) => o.name === "documentLink",
			) as INodePropertyTypeOptions;
			expect(documentLinkOption?.type).toBe("string");

			const documentNameOption = options?.find(
				(o) => o.name === "documentName",
			) as INodePropertyTypeOptions;
			expect(documentNameOption?.type).toBe("string");

			const documentOwnerOption = options?.find(
				(o) => o.name === "documentOwner",
			) as INodePropertyTypeOptions;
			expect(documentOwnerOption?.type).toBe("string");

			const pollingTimeoutOption = options?.find(
				(o) => o.name === "pollingTimeout",
			) as INodePropertyTypeOptions;
			expect(pollingTimeoutOption?.type).toBe("number");
			expect(pollingTimeoutOption?.default).toBe(60000);

			const waitForCompletionOption = options?.find(
				(o) => o.name === "waitForCompletion",
			) as INodePropertyTypeOptions;
			expect(waitForCompletionOption?.type).toBe("boolean");
			expect(waitForCompletionOption?.default).toBe(true);
		});
	});

	describe("Methods", () => {
		it("should have correct loadOptions methods", () => {
			expect(markupai.methods.loadOptions.loadStyleGuides).toBeDefined();
			expect(markupai.methods.loadOptions.loadTones).toBeDefined();
			expect(markupai.methods.loadOptions.loadDialects).toBeDefined();
		});
	});

	describe("Execute Method", () => {
		const mockInputData: INodeExecutionData[] = [{ json: { test: "data" } }];

		const mockStyleRequest = vi.fn();
		const mockGenerateEmailHTMLReport = vi.fn();
		const mockGetPath = vi.fn();

		const createExpectedExecuteResult = (
			jsonData: INodeExecutionData["json"],
			itemIndex = 0,
		): INodeExecutionData[][] => {
			return [
				[
					{
						json: jsonData,
						pairedItem: { item: itemIndex },
					},
				],
			];
		};

		const createExpectedResultWithCompletion = (
			workflowResponse: ReturnType<typeof createCheckWorkflowResponse>,
			itemIndex = 0,
		): INodeExecutionData[][] => {
			return createExpectedExecuteResult(
				{
					...workflowResponse,
					html_email: "<html>test report</html>",
				},
				itemIndex,
			);
		};

		const mockContentCheck = () => {
			const mockResult = createCheckWorkflowResponse();

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGenerateEmailHTMLReport.mockReturnValue("<html>test report</html>");
			mockGetPath.mockReturnValue("v1/style/checks");
		};

		const addItemMockReturns = (
			mock: ReturnType<typeof vi.fn>,
			tone: string,
			additionalOptions: Record<string, any>,
			content: string,
		) => {
			return mock
				.mockReturnValueOnce("styleCheck")
				.mockReturnValueOnce(additionalOptions)
				.mockReturnValueOnce(content)
				.mockReturnValueOnce("test-style-guide")
				.mockReturnValueOnce(tone)
				.mockReturnValueOnce("american_english");
		};

		const mockCommonFunctionResponses = (
			tone: string,
			additionalOptions = {},
			content = "test content",
		) => {
			return addItemMockReturns(vi.fn(), tone, additionalOptions, content);
		};

		const mockMultipleItemsFunctionResponses = (
			tone: string,
			additionalOptions = {},
			...contents: string[]
		) => {
			const mock = vi.fn();
			for (const content of contents) {
				addItemMockReturns(mock, tone, additionalOptions, content);
			}
			return mock;
		};

		beforeEach(async () => {
			const { styleRequest } = await import("../../nodes/Markupai/utils/style.api.utils");
			const { generateEmailHTMLReport } = await import(
				"../../nodes/Markupai/utils/email.generator"
			);
			const { getPath } = await import("../../nodes/Markupai/utils/style.api.utils");

			vi.mocked(styleRequest).mockImplementation(mockStyleRequest);
			vi.mocked(generateEmailHTMLReport).mockImplementation(mockGenerateEmailHTMLReport);
			vi.mocked(getPath).mockImplementation(mockGetPath);

			mockExecuteFunctions.getInputData = vi.fn().mockReturnValue(mockInputData);

			if (mockExecuteFunctions.helpers) {
				const addPairedItem = (item: INodeExecutionData, index: number) => ({
					...item,
					pairedItem: { item: index },
				});
				const returnJsonArrayImpl = (data: INodeExecutionData[]) => {
					return data.map(addPairedItem);
				};
				mockExecuteFunctions.helpers.returnJsonArray = vi
					.fn()
					.mockImplementation(returnJsonArrayImpl);
			}
		});

		it("should execute styleCheck operation successfully with completion", async () => {
			mockContentCheck();

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {
				waitForCompletion: true,
				pollingTimeout: 30000,
				documentName: "test.txt",
				documentOwner: "test-owner",
				documentLink: "https://test.com",
			});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				{
					content: "test content",
					contentType: ".txt",
					styleGuide: "test-style-guide",
					tone: "professional",
					dialect: "american_english",
					waitForCompletion: true,
					pollingTimeout: 30000,
				},
				"v1/style/checks",
				0,
			);

			expect(mockGenerateEmailHTMLReport).toHaveBeenCalledWith(createCheckWorkflowResponse(), {
				document_name: "test.txt",
				document_owner: "test-owner",
				document_link: "https://test.com",
			});

			const expectedResult = createExpectedResultWithCompletion(createCheckWorkflowResponse());
			expect(result).toEqual(expectedResult);
		});

		it("should execute styleRewrite operation successfully with completion", async () => {
			const mockResult = createCheckWorkflowResponse();

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGenerateEmailHTMLReport.mockReturnValue("<html>test report</html>");
			mockGetPath.mockReturnValue("v1/style/rewrites");

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {
				waitForCompletion: true,
			});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				{
					content: "test content",
					contentType: ".txt",
					styleGuide: "test-style-guide",
					tone: "professional",
					dialect: "american_english",
					waitForCompletion: true,
					pollingTimeout: 60000, // default value
				},
				"v1/style/rewrites",
				0,
			);

			const expectedResult = createExpectedResultWithCompletion(mockResult);
			expect(result).toEqual(expectedResult);
		});

		it('should handle "None (Keep Tone Unchanged)" tone correctly', async () => {
			mockContentCheck();

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses(
				"None (keep tone unchanged)",
				{ waitForCompletion: true },
			);

			await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				expect.not.objectContaining({ tone: expect.any(String) }),
				"v1/style/checks",
				0,
			);
		});

		it("should execute without waiting for completion", async () => {
			const mockResult = {
				status: "running",
				workflow_id: "test-id",
			};

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGetPath.mockReturnValue("v1/style/checks");

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {
				waitForCompletion: false,
			});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					waitForCompletion: false,
				}),
				"v1/style/checks",
				0,
			);

			const expectedResult = createExpectedExecuteResult(mockResult);
			expect(mockGenerateEmailHTMLReport).not.toHaveBeenCalled();
			expect(result).toEqual(expectedResult);
		});

		it("should throw NodeApiError when styleRequest fails", async () => {
			const error = new Error("API request failed");
			mockStyleRequest.mockRejectedValue(error);
			mockGetPath.mockReturnValue("v1/style/checks");

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {
				waitForCompletion: true,
			});

			mockExecuteFunctions.continueOnFail = vi.fn().mockReturnValue(false);

			await expect(markupai.execute.call(mockExecuteFunctions as any)).rejects.toThrow(Error);
		});

		it("should handle undefined additional options gracefully", async () => {
			mockContentCheck();

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {});

			await markupai.execute.call(mockExecuteFunctions as any);

			expect(mockStyleRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					waitForCompletion: true, // default value when undefined
					pollingTimeout: 60000, // default value when undefined
				}),
				"v1/style/checks",
				0,
			);
		});

		it("should include pairedItem object in execute response", async () => {
			mockContentCheck();

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {
				waitForCompletion: true,
			});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			const expectedResult = createExpectedResultWithCompletion(createCheckWorkflowResponse());
			expect(result).toEqual(expectedResult);
		});

		it("should only return json and pairedItem properties in execute response", async () => {
			mockContentCheck();

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {
				waitForCompletion: true,
			});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			const expectedResult = createExpectedResultWithCompletion(createCheckWorkflowResponse());
			expect(result).toEqual(expectedResult);
		});

		it("should only return json and pairedItem properties when waitForCompletion is false", async () => {
			const mockResult = {
				status: "running",
				workflow_id: "test-id",
			};

			mockStyleRequest.mockResolvedValue([{ json: mockResult }]);
			mockGetPath.mockReturnValue("v1/style/checks");

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {
				waitForCompletion: false,
			});

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			const expectedResult = createExpectedExecuteResult(mockResult);
			expect(result).toEqual(expectedResult);
		});

		it("should handle multiple items with continueOnFail when one fails", async () => {
			const twoItemsInputData: INodeExecutionData[] = [
				{ json: { test: "data1" } },
				{ json: { test: "data2" } },
			];

			mockExecuteFunctions.getInputData = vi.fn().mockReturnValue(twoItemsInputData);

			const firstItemError = new Error("API request failed for first item");
			const secondItemResult = createCheckWorkflowResponse();

			mockStyleRequest
				.mockRejectedValueOnce(firstItemError)
				.mockResolvedValueOnce([{ json: secondItemResult }]);

			mockGetPath.mockReturnValue("v1/style/checks");
			mockGenerateEmailHTMLReport.mockReturnValue("<html>test report</html>");

			mockExecuteFunctions.getNodeParameter = mockMultipleItemsFunctionResponses(
				"professional",
				{ waitForCompletion: true },
				"test content 1",
				"test content 2",
			);

			mockExecuteFunctions.continueOnFail = vi.fn().mockReturnValue(true);
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: "Markup AI" });

			const result = await markupai.execute.call(mockExecuteFunctions as any);

			const resultElement = result[0];

			expect(resultElement).toHaveLength(2);

			validateFirstItem(resultElement[0], firstItemError);
			validateSecondItem(resultElement[1], secondItemResult);

			expect(mockStyleRequest).toHaveBeenCalledTimes(2);

			expect(mockGenerateEmailHTMLReport).toHaveBeenCalledTimes(1);
		});

		it("should throw error when continueOnFail is false and error occurs", async () => {
			const singleItemInputData: INodeExecutionData[] = [{ json: { test: "data" } }];

			mockExecuteFunctions.getInputData = vi.fn().mockReturnValue(singleItemInputData);

			const error = new Error("API request failed");
			mockStyleRequest.mockRejectedValue(error);
			mockGetPath.mockReturnValue("v1/style/checks");

			mockExecuteFunctions.getNodeParameter = mockCommonFunctionResponses("professional", {
				waitForCompletion: true,
			});

			mockExecuteFunctions.continueOnFail = vi.fn().mockReturnValue(false);
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: "Markup AI" });

			await expect(markupai.execute.call(mockExecuteFunctions as any)).rejects.toThrow(Error);

			expect(mockStyleRequest).toHaveBeenCalledTimes(1);
			expect(mockGenerateEmailHTMLReport).not.toHaveBeenCalled();
		});
	});
});
