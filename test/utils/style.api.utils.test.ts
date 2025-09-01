import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	postStyleRewrite,
	pollResponse,
	styleRequest,
	getPath,
} from '../../nodes/Markupai/utils/style.api.utils';

vi.mock('../../nodes/Markupai/utils/load.options', () => ({
	getApiKey: vi.fn(),
	getBaseUrl: vi.fn(),
}));

describe('style.api.utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getPath', () => {
		it('should return correct path for styleCheck operation', () => {
			const result = getPath('styleCheck');
			expect(result).toBe('v1/style/checks');
		});

		it('should return correct path for rewrite operation', () => {
			const result = getPath('rewrite');
			expect(result).toBe('v1/style/rewrites');
		});
	});

	describe('postStyleRewrite', () => {
		it('should post style rewrite request successfully', async () => {
			const mockGetApiKey = vi.fn().mockResolvedValue('mocked-api-key-123');
			const mockGetBaseUrl = vi.fn().mockResolvedValue('https://api.markup.ai/');
			const mockHttpRequest = vi.fn().mockResolvedValue({
				body: {
					workflow_id: 'test-workflow-id',
					status: 'running',
					check_options: {
						style_guide: {
							style_guide_type: 'test',
							style_guide_id: 'test-style-guide',
						},
						dialect: 'american_english',
						tone: 'business',
					},
				},
			});

			const { getApiKey, getBaseUrl } = await import('../../nodes/Markupai/utils/load.options');
			vi.mocked(getApiKey).mockImplementation(mockGetApiKey);
			vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);

			const fn = {
				helpers: {
					httpRequest: mockHttpRequest,
				},
			};

			const formDataDetails = {
				content: 'test content',
				dialect: 'american_english',
				tone: 'business',
				styleGuide: 'test-style-guide',
				documentName: 'test.txt',
				documentOwner: 'test-owner',
				documentLink: 'https://test.com',
				waitForCompletion: true,
				pollingTimeout: 30_000,
			};

			const result = await postStyleRewrite(fn as any, formDataDetails, 'v1/style/rewrite');

			expect(result).toEqual({
				workflow_id: 'test-workflow-id',
				status: 'running',
				check_options: {
					style_guide: {
						style_guide_type: 'test',
						style_guide_id: 'test-style-guide',
					},
					dialect: 'american_english',
					tone: 'business',
				},
			});
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
			const mockGetApiKey = vi.fn().mockResolvedValue('mocked-api-key-123');
			const mockGetBaseUrl = vi.fn().mockResolvedValue('https://api.markup.ai/');
			const mockHttpRequest = vi.fn().mockRejectedValue(new Error('Network error'));

			const { getApiKey, getBaseUrl } = await import('../../nodes/Markupai/utils/load.options');
			vi.mocked(getApiKey).mockImplementation(mockGetApiKey);
			vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);

			const fn = {
				helpers: {
					httpRequest: mockHttpRequest,
				},
			};

			const formDataDetails = {
				content: 'test content',
				dialect: 'american_english',
				tone: 'business',
				styleGuide: 'test-style-guide',
				waitForCompletion: true,
				pollingTimeout: 30_000,
			};

			await expect(
				postStyleRewrite(fn as any, formDataDetails, 'v1/style/rewrite'),
			).rejects.toThrow('Network error');
		});
	});

	describe('pollResponse', () => {
		it('should poll until completion', async () => {
			const mockGetBaseUrl = vi.fn().mockResolvedValue('https://api.markup.ai/');
			const mockGetApiKey = vi.fn().mockResolvedValue('mocked-api-key-123');
			const mockHttpRequest = vi.fn().mockResolvedValue({
				body: {
					workflow_id: 'test-workflow-id',
					status: 'completed',
					rewrite: 'test-result',
					check_options: {
						style_guide: {
							style_guide_type: 'test',
							style_guide_id: 'test-style-guide',
						},
						dialect: 'american_english',
						tone: 'business',
					},
				},
			});

			const { getApiKey, getBaseUrl } = await import('../../nodes/Markupai/utils/load.options');
			vi.mocked(getApiKey).mockImplementation(mockGetApiKey);
			vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);

			const fn = {
				helpers: {
					httpRequest: mockHttpRequest,
				},
			};

			const styleRewriteResponse = {
				workflow_id: 'test-workflow-id',
				status: 'running' as const,
				check_options: {
					style_guide: {
						style_guide_type: 'test',
						style_guide_id: 'test-style-guide',
					},
					dialect: 'american_english',
					tone: 'business',
				},
			};

			const result = await pollResponse(
				fn as any,
				styleRewriteResponse,
				true,
				30_000,
				'v1/style/rewrite',
			);

			expect(result.status).toBe('completed');
			expect(result.rewrite).toBe('test-result');
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
			const mockGetBaseUrl = vi.fn().mockResolvedValue('https://api.markup.ai/');
			const mockGetApiKey = vi.fn().mockResolvedValue('mocked-api-key-123');
			const mockHttpRequest = vi.fn().mockResolvedValue({
				body: {
					workflow_id: 'test-workflow-id',
					status: 'failed',
					error: 'Workflow processing failed',
				},
			});

			const { getApiKey, getBaseUrl } = await import('../../nodes/Markupai/utils/load.options');
			vi.mocked(getApiKey).mockImplementation(mockGetApiKey);
			vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);

			const fn = {
				helpers: {
					httpRequest: mockHttpRequest,
				},
			};

			const styleRewriteResponse = {
				workflow_id: 'test-workflow-id',
				status: 'running' as const,
				check_options: {
					style_guide: {
						style_guide_type: 'test',
						style_guide_id: 'test-style-guide',
					},
					dialect: 'american_english',
					tone: 'business',
				},
			};

			await expect(
				pollResponse(fn as any, styleRewriteResponse, true, 30_000, 'v1/style/rewrite'),
			).rejects.toThrow('Workflow failed: Workflow processing failed');
		});

		it('should throw error on timeout', async () => {
			const mockGetBaseUrl = vi.fn().mockResolvedValue('https://api.markup.ai/');
			const mockGetApiKey = vi.fn().mockResolvedValue('mocked-api-key-123');

			const mockHttpRequest = vi.fn().mockResolvedValue({
				body: {
					workflow_id: 'test-workflow-id',
					status: 'running',
				},
			});

			const { getApiKey, getBaseUrl } = await import('../../nodes/Markupai/utils/load.options');
			vi.mocked(getApiKey).mockImplementation(mockGetApiKey);
			vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);

			const fn = {
				helpers: {
					httpRequest: mockHttpRequest,
				},
			};

			const styleRewriteResponse = {
				workflow_id: 'test-workflow-id',
				status: 'running' as const,
				check_options: {
					style_guide: {
						style_guide_type: 'test',
						style_guide_id: 'test-style-guide',
					},
					dialect: 'american_english',
					tone: 'business',
				},
			};

			const originalSetTimeout = global.setTimeout;
			global.setTimeout = vi.fn((callback: any) => {
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
				pollResponse(fn as any, styleRewriteResponse, true, 30_000, 'v1/style/rewrite'),
			).rejects.toThrow('Workflow timeout after 30000ms. Workflow ID: test-workflow-id');

			Date.now = originalDateNow;
			global.setTimeout = originalSetTimeout;
		});
	});

	describe('styleRequest', () => {
		it('should process style request successfully with completion', async () => {
			const mockGetApiKey = vi.fn().mockResolvedValue('mocked-api-key-123');
			const mockGetBaseUrl = vi.fn().mockResolvedValue('https://api.markup.ai/');
			const mockHttpRequest = vi
				.fn()
				.mockResolvedValueOnce({
					body: {
						workflow_id: 'test-workflow-id',
						status: 'running',
					},
				})
				.mockResolvedValueOnce({
					body: {
						workflow_id: 'test-workflow-id',
						status: 'completed',
						rewrite: 'test-result',
					},
				});

			const { getApiKey, getBaseUrl } = await import('../../nodes/Markupai/utils/load.options');
			vi.mocked(getApiKey).mockImplementation(mockGetApiKey);
			vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);

			const fn = {
				helpers: {
					httpRequest: mockHttpRequest,
				},
			};

			const formDataDetails = {
				content: 'test content',
				dialect: 'american_english',
				tone: 'business',
				styleGuide: 'test-style-guide',
				waitForCompletion: true,
				pollingTimeout: 30_000,
			};

			const result = await styleRequest(fn as any, formDataDetails, 'v1/style/rewrite', 0);

			expect(result).toEqual([
				{
					json: {
						workflow_id: 'test-workflow-id',
						status: 'completed',
						rewrite: 'test-result',
					},
					itemData: 0,
				},
			]);
		});

		it('should process style request without waiting for completion', async () => {
			const mockGetApiKey = vi.fn().mockResolvedValue('mocked-api-key-123');
			const mockGetBaseUrl = vi.fn().mockResolvedValue('https://api.markup.ai/');
			const mockHttpRequest = vi.fn().mockResolvedValue({
				body: {
					workflow_id: 'test-workflow-id',
					status: 'running',
				},
			});

			const { getApiKey, getBaseUrl } = await import('../../nodes/Markupai/utils/load.options');
			vi.mocked(getApiKey).mockImplementation(mockGetApiKey);
			vi.mocked(getBaseUrl).mockImplementation(mockGetBaseUrl);

			const fn = {
				helpers: {
					httpRequest: mockHttpRequest,
				},
			};

			const formDataDetails = {
				content: 'test content',
				dialect: 'american_english',
				tone: 'business',
				styleGuide: 'test-style-guide',
				waitForCompletion: false,
				pollingTimeout: 30_000,
			};

			const result = await styleRequest(fn as any, formDataDetails, 'v1/style/rewrite', 0);

			expect(result).toEqual([
				{
					json: {
						workflow_id: 'test-workflow-id',
						status: 'running',
					},
					itemData: 0,
				},
			]);
		});
	});
});
