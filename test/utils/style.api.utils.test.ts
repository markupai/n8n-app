import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IHttpRequestOptions, FunctionsBase } from "n8n-workflow";

import {
	postStyleRewrite,
	pollResponse,
	styleRequest,
	getPath,
	FormDataDetails,
} from "../../nodes/Markupai/utils/style.api.utils";
import type {
	GetStyleRewriteResponse,
	PostStyleRewriteResponse,
} from "../../nodes/Markupai/Markupai.api.types";

vi.mock("../../nodes/Markupai/utils/load.options", () => ({
	getBaseUrl: vi.fn(),
}));

vi.mock("n8n-workflow", async () => {
	const actual = await vi.importActual("n8n-workflow");
	return {
		...actual,
		sleep: vi.fn().mockImplementation(
			(ms: number) =>
				new Promise((resolve) => {
					vi.advanceTimersByTime(ms);
					resolve(undefined);
				}),
		),
	};
});

interface MockHttpRequest extends ReturnType<typeof vi.fn> {
	(body: IHttpRequestOptions): Promise<{ body: GetStyleRewriteResponse }>;
}

interface MockGetBaseUrl extends ReturnType<typeof vi.fn> {
	(fn: FunctionsBase): Promise<URL>;
}

interface MockFnObject {
	helpers: {
		httpRequest: MockHttpRequest;
		httpRequestWithAuthentication: {
			call: MockHttpRequest;
		};
	};
}

describe("style.api.utils", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const createMockFunctions = () => {
		const mockGetBaseUrl = vi
			.fn()
			.mockResolvedValue(new URL("https://api.markup.ai/")) as MockGetBaseUrl;
		const mockHttpRequest = vi.fn() as MockHttpRequest;
		const mockHttpRequestWithAuthentication = vi.fn() as MockHttpRequest;

		return { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication };
	};

	const setupMocks = async (mockGetBaseUrl: MockGetBaseUrl) => {
		const { getBaseUrl } = await import("../../nodes/Markupai/utils/load.options");
		vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);
	};

	const createFnObject = (
		mockHttpRequest: MockHttpRequest,
		mockHttpRequestWithAuthentication: MockHttpRequest,
	): MockFnObject => ({
		helpers: {
			httpRequest: mockHttpRequest,
			httpRequestWithAuthentication: {
				call: mockHttpRequestWithAuthentication,
			},
		},
	});

	const createPostResponse = (
		overrides: Partial<PostStyleRewriteResponse> = {},
	): PostStyleRewriteResponse => ({
		status: "running",
		workflow_id: "test-workflow-id",
		...overrides,
	});

	const setupMockPostResponse = (
		mockHttpRequestWithAuthentication: MockHttpRequest,
		response?: PostStyleRewriteResponse,
	) => {
		const postResponse = response || createPostResponse();
		mockHttpRequestWithAuthentication.mockResolvedValue({
			body: postResponse,
		});
		return postResponse;
	};

	describe("getPath", () => {
		it("should return correct path for styleCheck operation", () => {
			const result = getPath("styleCheck");
			expect(result).toBe("v1/style/checks");
		});

		it("should return correct path for rewrite operation", () => {
			const result = getPath("styleRewrite");
			expect(result).toBe("v1/style/rewrites");
		});
	});

	describe("postStyleRewrite", () => {
		const createFormDataDetails = (overrides: Partial<FormDataDetails> = {}): FormDataDetails => ({
			content: "test content",
			contentType: ".md",
			dialect: "american_english",
			tone: "business",
			styleGuide: "test-style-guide",
			documentName: "test.txt",
			documentOwner: "test-owner",
			documentLink: "https://test.com",
			waitForCompletion: true,
			pollingTimeout: 30_000,
			...overrides,
		});

		it("should post style rewrite request successfully", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();

			const postResponse = setupMockPostResponse(mockHttpRequestWithAuthentication);

			await setupMocks(mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);
			const formDataDetails = createFormDataDetails();

			// Spy on FormData.append to verify filename
			const formDataAppendSpy = vi.spyOn(FormData.prototype, "append");

			const result = await postStyleRewrite.call(fn as any, formDataDetails, "v1/style/rewrite");

			expect(result).toEqual(postResponse);
			expect(mockGetBaseUrl).toHaveBeenCalledWith(fn);
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(fn, "markupaiApi", {
				method: "POST",
				url: "https://api.markup.ai/v1/style/rewrite",
				headers: {
					"Content-Type": "multipart/form-data",
				},
				body: expect.any(Object),
				returnFullResponse: true,
			});

			// Verify filename is constructed correctly with documentName
			expect(formDataAppendSpy).toHaveBeenCalledWith(
				"file_upload",
				expect.any(Blob),
				"test.txt.md",
			);

			formDataAppendSpy.mockRestore();
		});

		it("should use 'unknown' as filename when documentName is not provided", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();

			const postResponse = setupMockPostResponse(mockHttpRequestWithAuthentication);

			await setupMocks(mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);
			const formDataDetails = createFormDataDetails({
				documentName: undefined,
				contentType: ".html",
			});

			// Spy on FormData.append to verify filename
			const formDataAppendSpy = vi.spyOn(FormData.prototype, "append");

			const result = await postStyleRewrite.call(fn as any, formDataDetails, "v1/style/rewrite");

			expect(result).toEqual(postResponse);

			// Verify filename is constructed with "unknown" when documentName is undefined
			expect(formDataAppendSpy).toHaveBeenCalledWith(
				"file_upload",
				expect.any(Blob),
				"unknown.html",
			);

			formDataAppendSpy.mockRestore();
		});

		it("should correctly construct filename with documentName and contentType", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();

			setupMockPostResponse(mockHttpRequestWithAuthentication);

			await setupMocks(mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);

			// Test with different content types
			const testCases = [
				{ documentName: "document", contentType: ".dita", expected: "document.dita" },
				{ documentName: "file", contentType: ".txt", expected: "file.txt" },
				{ documentName: "page", contentType: ".md", expected: "page.md" },
			];

			for (const testCase of testCases) {
				const formDataDetails = createFormDataDetails({
					documentName: testCase.documentName,
					contentType: testCase.contentType,
				});

				const formDataAppendSpy = vi.spyOn(FormData.prototype, "append");

				await postStyleRewrite.call(fn as any, formDataDetails, "v1/style/rewrite");

				expect(formDataAppendSpy).toHaveBeenCalledWith(
					"file_upload",
					expect.any(Blob),
					testCase.expected,
				);

				formDataAppendSpy.mockRestore();
				mockHttpRequestWithAuthentication.mockClear();
			}
		});

		it("should throw an error if httpRequest fails", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();
			mockHttpRequestWithAuthentication.mockRejectedValue(new Error("Network error"));

			await setupMocks(mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);
			const formDataDetails = createFormDataDetails({
				documentName: undefined,
				documentOwner: undefined,
				documentLink: undefined,
			});

			await expect(
				postStyleRewrite.call(fn as any, formDataDetails, "v1/style/rewrite"),
			).rejects.toThrow("Network error");
		});
	});

	describe("pollResponse", () => {
		const postStyleRewriteResponse: PostStyleRewriteResponse = {
			status: "running",
			workflow_id: "test-workflow-id",
		};

		const completedResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: "test-workflow-id",
				status: "completed",
				api_version: "1.0.0",
				type: "rewrites",
			},
			rewrite: {
				text: "test-result",
				scores: {
					quality: {
						score: 85,
						grammar: { score: 90, issues: 2 },
						consistency: { score: 85, issues: 1 },
						terminology: { score: 92, issues: 0 },
					},
					analysis: {
						clarity: {
							score: 80,
							word_count: 150,
							sentence_count: 10,
							average_sentence_length: 15,
							flesch_reading_ease: 70,
							vocabulary_complexity: 0.6,
							sentence_complexity: 0.5,
						},
						tone: {
							score: 88,
							informality: 0.3,
							liveliness: 0.4,
							informality_alignment: 150,
							liveliness_alignment: 120,
						},
					},
				},
			},
			config: {
				style_guide: {
					style_guide_type: "test",
					style_guide_id: "test-style-guide",
				},
				dialect: "american_english",
				tone: "business",
			},
			original: {
				issues: [],
				scores: {
					quality: {
						score: 85,
						grammar: { score: 90, issues: 2 },
						consistency: { score: 85, issues: 1 },
						terminology: { score: 92, issues: 0 },
					},
					analysis: {
						clarity: {
							score: 80,
							word_count: 150,
							sentence_count: 10,
							average_sentence_length: 15,
							flesch_reading_ease: 70,
							vocabulary_complexity: 0.6,
							sentence_complexity: 0.5,
						},
						tone: {
							score: 88,
							informality: 0.3,
							liveliness: 0.4,
							informality_alignment: 150,
							liveliness_alignment: 120,
						},
					},
				},
			},
		};

		const failedResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: "test-workflow-id",
				status: "failed",
				api_version: "1.0.0",
				type: "rewrites",
			},
		};

		const runningResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: "test-workflow-id",
				status: "running",
				api_version: "1.0.0",
				type: "rewrites",
			},
		};

		it("should poll until completion", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();
			mockHttpRequestWithAuthentication.mockResolvedValue({
				body: completedResponseBody,
			});

			await setupMocks(mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);

			const result = await pollResponse.call(
				fn as any,
				postStyleRewriteResponse,
				true,
				30_000,
				"v1/style/rewrite",
			);

			expect(result.workflow.status).toBe("completed");
			expect(result.rewrite?.text).toBe("test-result");
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(fn as any, "markupaiApi", {
				method: "GET",
				url: "https://api.markup.ai/v1/style/rewrite/test-workflow-id",
				returnFullResponse: true,
			});
		});

		it("should throw error on workflow failure", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();
			mockHttpRequestWithAuthentication.mockResolvedValue({
				body: failedResponseBody,
			});

			await setupMocks(mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);

			await expect(
				pollResponse.call(fn as any, postStyleRewriteResponse, true, 30_000, "v1/style/rewrite"),
			).rejects.toThrow("Workflow failed: test-workflow-id");
		});

		it("should throw error on timeout", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();
			mockHttpRequestWithAuthentication.mockResolvedValue({
				body: runningResponseBody,
			});

			await setupMocks(mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);

			const pollPromise = pollResponse.call(
				fn as any,
				postStyleRewriteResponse,
				true,
				30_000,
				"v1/style/rewrite",
			);

			// Advance timers to trigger timeout
			vi.advanceTimersByTime(30_000);

			await expect(pollPromise).rejects.toThrow(
				"Workflow timeout after 30000ms. Workflow ID: test-workflow-id",
			);
		});
	});

	describe("styleRequest", () => {
		let fn: MockFnObject;

		const formDataDetails: FormDataDetails = {
			content: "test content",
			contentType: ".md",
			dialect: "american_english",
			tone: "business",
			styleGuide: "test-style-guide",
			waitForCompletion: true,
			pollingTimeout: 30_000,
		};

		const completedResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: "test-workflow-id",
				status: "completed",
				api_version: "1.0.0",
				type: "rewrites",
			},
			config: {
				style_guide: {
					style_guide_type: "test",
					style_guide_id: "test-style-guide",
				},
				dialect: "american_english",
				tone: "business",
			},
			original: {
				issues: [],
				scores: {
					quality: {
						score: 85,
						grammar: { score: 90, issues: 2 },
						consistency: { score: 85, issues: 1 },
						terminology: { score: 92, issues: 0 },
					},
					analysis: {
						clarity: {
							score: 80,
							word_count: 150,
							sentence_count: 10,
							average_sentence_length: 15,
							flesch_reading_ease: 70,
							vocabulary_complexity: 0.6,
							sentence_complexity: 0.5,
						},
						tone: {
							score: 88,
							informality: 0.3,
							liveliness: 0.4,
							informality_alignment: 150,
							liveliness_alignment: 120,
						},
					},
				},
			},
			rewrite: {
				text: "test-result",
				scores: {
					quality: {
						score: 85,
						grammar: { score: 90, issues: 2 },
						consistency: { score: 85, issues: 1 },
						terminology: { score: 92, issues: 0 },
					},
					analysis: {
						clarity: {
							score: 80,
							word_count: 150,
							sentence_count: 10,
							average_sentence_length: 15,
							flesch_reading_ease: 70,
							vocabulary_complexity: 0.6,
							sentence_complexity: 0.5,
						},
						tone: {
							score: 88,
							informality: 0.3,
							liveliness: 0.4,
							informality_alignment: 150,
							liveliness_alignment: 120,
						},
					},
				},
			},
		};

		it("should process style request successfully with completion", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();
			const postResponse = createPostResponse();
			mockHttpRequestWithAuthentication
				.mockResolvedValueOnce({
					body: postResponse,
				})
				.mockResolvedValueOnce({
					body: completedResponseBody,
				});

			await setupMocks(mockGetBaseUrl);
			fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);

			const result = await styleRequest.call(fn as any, formDataDetails, "v1/style/rewrite", 0);

			expect(result).toEqual([
				{
					json: {
						workflow: completedResponseBody.workflow,
						rewrite: completedResponseBody.rewrite,
						config: completedResponseBody.config,
						original: completedResponseBody.original,
					},
					itemData: 0,
				},
			]);
		});

		it("should process style request without waiting for completion", async () => {
			const { mockGetBaseUrl, mockHttpRequest, mockHttpRequestWithAuthentication } =
				createMockFunctions();
			const postResponse = setupMockPostResponse(mockHttpRequestWithAuthentication);

			await setupMocks(mockGetBaseUrl);
			fn = createFnObject(mockHttpRequest, mockHttpRequestWithAuthentication);
			const formDataDetailsWithoutCompletion: FormDataDetails = {
				...formDataDetails,
				waitForCompletion: false,
			};

			const result = await styleRequest.call(
				fn as any,
				formDataDetailsWithoutCompletion,
				"v1/style/rewrite",
				0,
			);

			expect(result).toEqual([
				{
					json: postResponse,
					itemData: 0,
				},
			]);
		});
	});
});
