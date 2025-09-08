import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IHttpRequestOptions, FunctionsBase } from 'n8n-workflow';
import {
	postStyleRewrite,
	pollResponse,
	styleRequest,
	getPath,
	FormDataDetails,
} from '../../nodes/Markupai/utils/style.api.utils';
import type {
	GetStyleRewriteResponse,
	PostStyleRewriteResponse,
} from '../../nodes/Markupai/Markupai.api.types';

vi.mock('../../nodes/Markupai/utils/load.options', () => ({
	getApiKey: vi.fn(),
	getBaseUrl: vi.fn(),
}));

interface MockHttpRequest extends ReturnType<typeof vi.fn> {
	(body: IHttpRequestOptions): Promise<{ body: GetStyleRewriteResponse }>;
}

interface MockGetApiKey extends ReturnType<typeof vi.fn> {
	(fn: FunctionsBase): Promise<string>;
}

interface MockGetBaseUrl extends ReturnType<typeof vi.fn> {
	(fn: FunctionsBase): Promise<URL>;
}

interface MockFnObject {
	helpers: {
		httpRequest: MockHttpRequest;
	};
}

describe('style.api.utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockFunctions = () => {
		const mockGetApiKey = vi.fn().mockResolvedValue('mocked-api-key-123') as MockGetApiKey;
		const mockGetBaseUrl = vi
			.fn()
			.mockResolvedValue(new URL('https://api.markup.ai/')) as MockGetBaseUrl;
		const mockHttpRequest = vi.fn() as MockHttpRequest;

		return { mockGetApiKey, mockGetBaseUrl, mockHttpRequest };
	};

	const setupMocks = async (mockGetApiKey: MockGetApiKey, mockGetBaseUrl: MockGetBaseUrl) => {
		const { getApiKey, getBaseUrl } = await import('../../nodes/Markupai/utils/load.options');
		vi.mocked(getApiKey).mockImplementation(mockGetApiKey);
		vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);
	};

	const createFnObject = (mockHttpRequest: MockHttpRequest): MockFnObject => ({
		helpers: {
			httpRequest: mockHttpRequest,
		},
	});

	describe('getPath', () => {
		it('should return correct path for styleCheck operation', () => {
			const result = getPath('styleCheck');
			expect(result).toBe('v1/style/checks');
		});

		it('should return correct path for rewrite operation', () => {
			const result = getPath('styleRewrite');
			expect(result).toBe('v1/style/rewrites');
		});
	});

	describe('postStyleRewrite', () => {
		const createFormDataDetails = (overrides: Partial<FormDataDetails> = {}): FormDataDetails => ({
			content: 'test content',
			dialect: 'american_english',
			tone: 'business',
			styleGuide: 'test-style-guide',
			documentName: 'test.txt',
			documentOwner: 'test-owner',
			documentLink: 'https://test.com',
			waitForCompletion: true,
			pollingTimeout: 30_000,
			...overrides,
		});

		const mockResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: 'test-workflow-id',
				status: 'running',
				api_version: '1.0.0',
				type: 'rewrites',
			},
		};

		it('should post style rewrite request successfully', async () => {
			const { mockGetApiKey, mockGetBaseUrl, mockHttpRequest } = createMockFunctions();

			mockHttpRequest.mockResolvedValue({
				body: mockResponseBody,
			});

			await setupMocks(mockGetApiKey, mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest);
			const formDataDetails = createFormDataDetails();

			const result = await postStyleRewrite(fn as any, formDataDetails, 'v1/style/rewrite');

			expect(result).toEqual(mockResponseBody);
			expect(mockGetApiKey).toHaveBeenCalledWith(fn);
			expect(mockGetBaseUrl).toHaveBeenCalledWith(fn);
			expect(mockHttpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://api.markup.ai/v1/style/rewrite',
				headers: expect.objectContaining({
					Authorization: 'Bearer mocked-api-key-123',
				}),
				body: expect.any(Object),
				returnFullResponse: true,
			});
		});

		it('should throw an error if httpRequest fails', async () => {
			const { mockGetApiKey, mockGetBaseUrl, mockHttpRequest } = createMockFunctions();
			mockHttpRequest.mockRejectedValue(new Error('Network error'));

			await setupMocks(mockGetApiKey, mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest);
			const formDataDetails = createFormDataDetails({
				documentName: undefined,
				documentOwner: undefined,
				documentLink: undefined,
			});

			await expect(
				postStyleRewrite(fn as any, formDataDetails, 'v1/style/rewrite'),
			).rejects.toThrow('Network error');
		});
	});

	describe('pollResponse', () => {
		const postStyleRewriteResponse: PostStyleRewriteResponse = {
			status: 'running',
			workflow_id: 'test-workflow-id',
		};

		const completedResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: 'test-workflow-id',
				status: 'completed',
				api_version: '1.0.0',
				type: 'rewrites',
			},
			rewrite: {
				text: 'test-result',
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
							informality_alignment: 150.0,
							liveliness_alignment: 120.0,
						},
					},
				},
			},
			config: {
				style_guide: {
					style_guide_type: 'test',
					style_guide_id: 'test-style-guide',
				},
				dialect: 'american_english',
				tone: 'business',
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
							informality_alignment: 150.0,
							liveliness_alignment: 120.0,
						},
					},
				},
			},
		};

		const failedResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: 'test-workflow-id',
				status: 'failed',
				api_version: '1.0.0',
				type: 'rewrites',
			},
		};

		const runningResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: 'test-workflow-id',
				status: 'running',
				api_version: '1.0.0',
				type: 'rewrites',
			},
		};

		it('should poll until completion', async () => {
			const { mockGetApiKey, mockGetBaseUrl, mockHttpRequest } = createMockFunctions();
			mockHttpRequest.mockResolvedValue({
				body: completedResponseBody,
			});

			await setupMocks(mockGetApiKey, mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest);

			const result = await pollResponse(
				fn as any,
				postStyleRewriteResponse,
				true,
				30_000,
				'v1/style/rewrite',
			);

			expect(result.workflow.status).toBe('completed');
			expect(result.rewrite?.text).toBe('test-result');
			expect(mockHttpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://api.markup.ai/v1/style/rewrite/test-workflow-id',
				headers: {
					Authorization: 'Bearer mocked-api-key-123',
				},
				returnFullResponse: true,
			});
		});

		it('should throw error on workflow failure', async () => {
			const { mockGetApiKey, mockGetBaseUrl, mockHttpRequest } = createMockFunctions();
			mockHttpRequest.mockResolvedValue({
				body: failedResponseBody,
			});

			await setupMocks(mockGetApiKey, mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest);

			await expect(
				pollResponse(fn as any, postStyleRewriteResponse, true, 30_000, 'v1/style/rewrite'),
			).rejects.toThrow('Workflow failed: test-workflow-id');
		});

		it('should throw error on timeout', async () => {
			const { mockGetApiKey, mockGetBaseUrl, mockHttpRequest } = createMockFunctions();
			mockHttpRequest.mockResolvedValue({
				body: runningResponseBody,
			});

			await setupMocks(mockGetApiKey, mockGetBaseUrl);
			const fn = createFnObject(mockHttpRequest);

			const originalSetTimeout = global.setTimeout;
			global.setTimeout = vi.fn((callback: () => void) => {
				callback();
				return 1 as any;
			}) as any;

			let timeValue = Date.now();
			const originalDateNow = Date.now;
			Date.now = vi.fn(() => {
				timeValue += 2000;
				return timeValue;
			});

			await expect(
				pollResponse(fn as any, postStyleRewriteResponse, true, 30_000, 'v1/style/rewrite'),
			).rejects.toThrow('Workflow timeout after 30000ms. Workflow ID: test-workflow-id');

			Date.now = originalDateNow;
			global.setTimeout = originalSetTimeout;
		});
	});

	describe('styleRequest', () => {
		const fn: MockFnObject = {
			helpers: {
				httpRequest: {} as MockHttpRequest,
			},
		};

		const formDataDetails: FormDataDetails = {
			content: 'test content',
			dialect: 'american_english',
			tone: 'business',
			styleGuide: 'test-style-guide',
			waitForCompletion: true,
			pollingTimeout: 30_000,
		};

		const runningResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: 'test-workflow-id',
				status: 'running',
				api_version: '1.0.0',
				type: 'rewrites',
			},
		};

		const completedResponseBody: GetStyleRewriteResponse = {
			workflow: {
				id: 'test-workflow-id',
				status: 'completed',
				api_version: '1.0.0',
				type: 'rewrites',
			},
			config: {
				style_guide: {
					style_guide_type: 'test',
					style_guide_id: 'test-style-guide',
				},
				dialect: 'american_english',
				tone: 'business',
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
							informality_alignment: 150.0,
							liveliness_alignment: 120.0,
						},
					},
				},
			},
			rewrite: {
				text: 'test-result',
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
							informality_alignment: 150.0,
							liveliness_alignment: 120.0,
						},
					},
				},
			},
		};

		it('should process style request successfully with completion', async () => {
			const { mockGetApiKey, mockGetBaseUrl, mockHttpRequest } = createMockFunctions();
			mockHttpRequest
				.mockResolvedValueOnce({
					body: {
						status: 'running',
						workflow_id: 'test-workflow-id',
					},
				})
				.mockResolvedValueOnce({
					body: runningResponseBody,
				})
				.mockResolvedValueOnce({
					body: completedResponseBody,
				});

			await setupMocks(mockGetApiKey, mockGetBaseUrl);
			fn.helpers.httpRequest = mockHttpRequest;

			const result = await styleRequest(fn as any, formDataDetails, 'v1/style/rewrite', 0);

			expect(result).toEqual([
				{
					json: {
						status: 'completed',
						...completedResponseBody,
					},
					itemData: 0,
				},
			]);
		});

		it('should process style request without waiting for completion', async () => {
			const { mockGetApiKey, mockGetBaseUrl, mockHttpRequest } = createMockFunctions();
			mockHttpRequest.mockResolvedValue({
				body: runningResponseBody,
			});

			await setupMocks(mockGetApiKey, mockGetBaseUrl);
			fn.helpers.httpRequest = mockHttpRequest;
			const formDataDetailsWithoutCompletion: FormDataDetails = {
				...formDataDetails,
				waitForCompletion: false,
			};

			const result = await styleRequest(
				fn as any,
				formDataDetailsWithoutCompletion,
				'v1/style/rewrite',
				0,
			);

			expect(result).toEqual([
				{
					json: runningResponseBody,
					itemData: 0,
				},
			]);
		});
	});
});
