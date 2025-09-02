import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FunctionsBase, ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import {
	getApiKey,
	getBaseUrl,
	loadDialects,
	loadStyleGuides,
	loadTones,
} from '../../nodes/Markupai/utils/load.options';

// Type definitions for mocks
interface MockFunctionsBase extends FunctionsBase {
	getCredentials: ReturnType<typeof vi.fn>;
}

interface MockLoadOptionsFunctions {
	getCredentials: ReturnType<typeof vi.fn>;
	helpers: {
		httpRequest: ReturnType<typeof vi.fn>;
	};
}

describe('load.options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getApiKey', () => {
		it('returns the API key from credentials', async () => {
			const fn: MockFunctionsBase = {
				getCredentials: vi.fn().mockResolvedValue({ apiKey: 'mocked-key-123' }),
			} as MockFunctionsBase;

			const result = await getApiKey(fn);

			expect(result).toBe('mocked-key-123');
			expect(fn.getCredentials).toHaveBeenCalledWith('markupaiApi');
		});
	});

	describe('getBaseUrl', () => {
		it.each(['https://api.markup.ai', 'https://api.markup.ai/'])(
			'normalizes URL from "%s" to "https://api.markup.ai/"',
			async (input) => {
				const fn: MockFunctionsBase = {
					getCredentials: vi.fn().mockResolvedValue({ baseUrl: input }),
				} as MockFunctionsBase;

				const result = await getBaseUrl(fn);

				expect(result.toString()).toBe('https://api.markup.ai/');
				expect(fn.getCredentials).toHaveBeenCalledWith('markupaiApi');
			},
		);
	});

	describe('loadStyleGuides', () => {
		const styleGuidesResponse = [
			{ id: '1', name: 'Style Guide 1' },
			{ id: '2', name: 'Style Guide 2' },
		];

		it('returns the style guides from the API', async () => {
			const fn: MockLoadOptionsFunctions = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: styleGuidesResponse,
						statusCode: 200,
					}),
				},
			} as MockLoadOptionsFunctions;

			const result = await loadStyleGuides.call(fn);

			expect(result).toEqual([
				{ name: 'Style Guide 1', value: '1' },
				{ name: 'Style Guide 2', value: '2' },
			]);
			expect(fn.getCredentials).toHaveBeenCalledWith('markupaiApi');
		});

		it('throws an error if the API key is not found', async () => {
			const fn: MockLoadOptionsFunctions = {
				getCredentials: vi.fn().mockResolvedValue({}),
				helpers: {
					httpRequest: vi.fn(),
				},
			} as MockLoadOptionsFunctions;

			await expect(loadStyleGuides.call(fn)).rejects.toThrow('Error loading style guides');
		});

		it('throws an error if the API returns an error', async () => {
			const fn: MockLoadOptionsFunctions = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { error: 'Bad Request' },
						statusCode: 400,
					}),
				},
			} as MockLoadOptionsFunctions;

			await expect(loadStyleGuides.call(fn)).rejects.toThrow('Error loading style guides');
		});
	});

	describe('loadTones', () => {
		const tonesResponse = { tones: ['tone_1', 'tone_2'] };
		it('returns the tones from the API', async () => {
			const fn: MockLoadOptionsFunctions = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: tonesResponse,
						statusCode: 200,
					}),
				},
			} as MockLoadOptionsFunctions;

			const result = await loadTones.call(fn);

			expect(result).toEqual([
				{ name: 'tone_1', value: 'tone_1' },
				{ name: 'tone_2', value: 'tone_2' },
			]);
		});

		it('returns the default tones if the API returns an error', async () => {
			const fn: MockLoadOptionsFunctions = {
				getCredentials: vi.fn().mockResolvedValue({}),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { error: 'Bad Request' },
						statusCode: 400,
					}),
				},
			} as MockLoadOptionsFunctions;

			const result = await loadTones.call(fn);

			expect(result).toEqual([
				{ name: 'academic', value: 'academic' },
				{ name: 'business', value: 'business' },
				{ name: 'casual', value: 'casual' },
				{ name: 'conversational', value: 'conversational' },
				{ name: 'formal', value: 'formal' },
				{ name: 'gen-z', value: 'gen-z' },
				{ name: 'informal', value: 'informal' },
				{ name: 'technical', value: 'technical' },
			]);
		});
	});

	describe('loadDialects', () => {
		it('returns the dialects from the API', async () => {
			const fn: MockLoadOptionsFunctions = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { dialects: ['english_uk', 'english_us'] },
						statusCode: 200,
					}),
				},
			} as MockLoadOptionsFunctions;

			const result = await loadDialects.call(fn);

			expect(result).toEqual([
				{ name: 'english_uk', value: 'english_uk' },
				{ name: 'english_us', value: 'english_us' },
			]);
		});

		it('returns the default dialects if the API returns an error', async () => {
			const fn: MockLoadOptionsFunctions = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { error: 'Bad Request' },
						statusCode: 400,
					}),
				},
			} as MockLoadOptionsFunctions;

			const result = await loadDialects.call(fn);

			expect(result).toEqual([
				{ name: 'american_english', value: 'american_english' },
				{ name: 'australian_english', value: 'australian_english' },
				{ name: 'british_oxford', value: 'british_oxford' },
				{ name: 'canadian_english', value: 'canadian_english' },
				{ name: 'indian_english', value: 'indian_english' },
			]);
		});
	});
});
