import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FunctionsBase } from 'n8n-workflow';
import {
	getApiKey,
	getBaseUrl,
	loadDialects,
	loadStyleGuides,
	loadTones,
} from '../../nodes/Markupai/utils/load.options';

interface MockFunctionsBase extends FunctionsBase {
	getCredentials: ReturnType<typeof vi.fn>;
}

describe('load.options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getApiKey', () => {
		it('returns the API key from credentials', async () => {
			const mockFunctionsBase: MockFunctionsBase = {
				getCredentials: vi.fn().mockResolvedValue({ apiKey: 'mocked-key-123' }),
			} as MockFunctionsBase;

			const result = await getApiKey(mockFunctionsBase);

			expect(result).toBe('mocked-key-123');
			expect(mockFunctionsBase.getCredentials).toHaveBeenCalledWith('markupaiApi');
		});
	});

	describe('getBaseUrl', () => {
		it.each(['https://api.markup.ai', 'https://api.markup.ai/'])(
			'normalizes URL from "%s" to "https://api.markup.ai/"',
			async (input) => {
				const mockFunctionsBase: MockFunctionsBase = {
					getCredentials: vi.fn().mockResolvedValue({ baseUrl: input }),
				} as MockFunctionsBase;

				const result = await getBaseUrl(mockFunctionsBase);

				expect(result.toString()).toBe('https://api.markup.ai/');
				expect(mockFunctionsBase.getCredentials).toHaveBeenCalledWith('markupaiApi');
			},
		);
	});

	describe('loadStyleGuides', () => {
		const styleGuidesResponse = [
			{ id: '1', name: 'Style Guide 1' },
			{ id: '2', name: 'Style Guide 2' },
		];

		it('returns the style guides from the API', async () => {
			const loadOptionsFunction = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: styleGuidesResponse,
						statusCode: 200,
					}),
				},
			} as any;

			const result = await loadStyleGuides.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: 'Style Guide 1', value: '1' },
				{ name: 'Style Guide 2', value: '2' },
			]);
			expect(loadOptionsFunction.getCredentials).toHaveBeenCalledWith('markupaiApi');
		});

		it('throws an error if the API key is not found', async () => {
			const loadOptionsFunction = {
				getCredentials: vi.fn().mockResolvedValue({}),
				helpers: {
					httpRequest: vi.fn(),
				},
			} as any;

			await expect(loadStyleGuides.call(loadOptionsFunction)).rejects.toThrow(
				'Error loading style guides',
			);
		});

		it('throws an error if the API returns an error', async () => {
			const loadOptionsFunction = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { error: 'Bad Request' },
						statusCode: 400,
					}),
				},
			} as any;

			await expect(loadStyleGuides.call(loadOptionsFunction)).rejects.toThrow(
				'Error loading style guides',
			);
		});
	});

	describe('loadTones', () => {
		const tonesResponse = { tones: ['tone_1', 'tone_2'] };
		it('returns the tones from the API', async () => {
			const loadOptionsFunction = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: tonesResponse,
						statusCode: 200,
					}),
				},
			} as any;

			const result = await loadTones.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: 'None (Keep Tone Unchanged)', value: 'None (Keep Tone Unchanged)' },
				{ name: 'tone_1', value: 'tone_1' },
				{ name: 'tone_2', value: 'tone_2' },
			]);
		});

		it('returns the default tones if the API returns an error', async () => {
			const loadOptionsFunction = {
				getCredentials: vi.fn().mockResolvedValue({}),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { error: 'Bad Request' },
						statusCode: 400,
					}),
				},
			} as any;

			const result = await loadTones.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: 'None (Keep Tone Unchanged)', value: 'None (Keep Tone Unchanged)' },
				{ name: 'academic', value: 'academic' },
				{ name: 'confident', value: 'confident' },
				{ name: 'conversational', value: 'conversational' },
				{ name: 'empathetic', value: 'empathetic' },
				{ name: 'engaging', value: 'engaging' },
				{ name: 'friendly', value: 'friendly' },
				{ name: 'professional', value: 'professional' },
				{ name: 'technical', value: 'technical' },
			]);
		});

		it('includes "None (Keep Tone Unchanged)" as the first option when API returns tones', async () => {
			const loadOptionsFunction = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { tones: ['tone_1', 'tone_2'] },
						statusCode: 200,
					}),
				},
			} as any;

			const result = await loadTones.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: 'None (Keep Tone Unchanged)', value: 'None (Keep Tone Unchanged)' },
				{ name: 'tone_1', value: 'tone_1' },
				{ name: 'tone_2', value: 'tone_2' },
			]);
		});
	});

	describe('loadDialects', () => {
		it('returns the dialects from the API', async () => {
			const loadOptionsFunction = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { dialects: ['english_uk', 'english_us'] },
						statusCode: 200,
					}),
				},
			} as any;

			const result = await loadDialects.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: 'english_uk', value: 'english_uk' },
				{ name: 'english_us', value: 'english_us' },
			]);
		});

		it('returns the default dialects if the API returns an error', async () => {
			const loadOptionsFunction = {
				getCredentials: vi
					.fn()
					.mockResolvedValue({ apiKey: 'mocked-key-123', baseUrl: 'https://api.markup.ai' }),
				helpers: {
					httpRequest: vi.fn().mockResolvedValue({
						body: { error: 'Bad Request' },
						statusCode: 400,
					}),
				},
			} as any;

			const result = await loadDialects.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: 'american_english', value: 'american_english' },
				{ name: 'british_english', value: 'british_english' },
				{ name: 'canadian_english', value: 'canadian_english' },
			]);
		});
	});
});
