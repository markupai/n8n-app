import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ILoadOptionsFunctions } from "n8n-workflow";
import { LoggerProxy } from "n8n-workflow";
import {
	getBaseUrl,
	loadDialects,
	loadStyleGuides,
	loadTones,
} from "../../nodes/Markupai/utils/load.options";

vi.mock("n8n-workflow", async () => {
	const actual = await vi.importActual("n8n-workflow");
	return {
		...actual,
		LoggerProxy: {
			error: vi.fn(),
		},
	};
});

function createMockLoadOptionsFunctions(mock: {
	getCredentials: ReturnType<typeof vi.fn>;
	helpers: {
		httpRequestWithAuthentication: {
			call: ReturnType<typeof vi.fn>;
		};
	};
}): ILoadOptionsFunctions {
	return mock as unknown as ILoadOptionsFunctions;
}

describe("load.options", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(LoggerProxy.error).mockClear();
	});

	describe("getBaseUrl", () => {
		beforeEach(() => {
			// Clear environment variables before each test
			delete process.env.MARKUP_AI_BASE_URL;
			delete process.env.NODE_ENV;
		});

		it("returns production URL by default", async () => {
			const result = await getBaseUrl();

			expect(result.toString()).toBe("https://api.markup.ai/");
		});

		it("returns production URL when NODE_ENV is production", async () => {
			process.env.NODE_ENV = "production";

			const result = await getBaseUrl();

			expect(result.toString()).toBe("https://api.markup.ai/");
		});

		it("returns production URL when NODE_ENV is not production (no env var set)", async () => {
			process.env.NODE_ENV = "development";

			const result = await getBaseUrl();

			expect(result.toString()).toBe("https://api.markup.ai/");
		});

		it("returns custom URL from MARKUP_AI_BASE_URL environment variable", async () => {
			process.env.MARKUP_AI_BASE_URL = "https://api.dev.markup.ai/";

			const result = await getBaseUrl();

			expect(result.toString()).toBe("https://api.dev.markup.ai/");
		});

		it("returns custom URL from MARKUP_AI_BASE_URL even when NODE_ENV is production", async () => {
			process.env.NODE_ENV = "production";
			process.env.MARKUP_AI_BASE_URL = "https://custom.api.markup.ai/";

			const result = await getBaseUrl();

			expect(result.toString()).toBe("https://custom.api.markup.ai/");
		});
	});

	describe("loadStyleGuides", () => {
		const styleGuidesResponse = [
			{ id: "1", name: "Style Guide 1" },
			{ id: "2", name: "Style Guide 2" },
		];

		it("returns the style guides from the API", async () => {
			const loadOptionsFunction = createMockLoadOptionsFunctions({
				getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key-123" }),
				helpers: {
					httpRequestWithAuthentication: {
						call: vi.fn().mockResolvedValue({
							body: styleGuidesResponse,
							statusCode: 200,
						}),
					},
				},
			});

			const result = await loadStyleGuides.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: "Style Guide 1", value: "1" },
				{ name: "Style Guide 2", value: "2" },
			]);
		});

		it("throws an error if the API key is not found", async () => {
			const loadOptionsFunction = createMockLoadOptionsFunctions({
				getCredentials: vi.fn().mockResolvedValue({}),
				helpers: {
					httpRequestWithAuthentication: {
						call: vi.fn().mockRejectedValue(new Error("Credentials error")),
					},
				},
			});

			await expect(loadStyleGuides.call(loadOptionsFunction)).rejects.toThrow(
				"Error loading style guides",
			);
		});

		it("throws an error if the API returns an error", async () => {
			const loadOptionsFunction = createMockLoadOptionsFunctions({
				getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key-123" }),
				helpers: {
					httpRequestWithAuthentication: {
						call: vi.fn().mockResolvedValue({
							body: { error: "Bad Request" },
							statusCode: 400,
						}),
					},
				},
			});

			await expect(loadStyleGuides.call(loadOptionsFunction)).rejects.toThrow(
				"Error loading style guides",
			);
		});
	});

	describe("loadTones", () => {
		const tonesResponse = { tones: ["tone_1", "tone_2"] };
		it("returns the tones from the API", async () => {
			const loadOptionsFunction = createMockLoadOptionsFunctions({
				getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key-123" }),
				helpers: {
					httpRequestWithAuthentication: {
						call: vi.fn().mockResolvedValue({
							body: tonesResponse,
							statusCode: 200,
						}),
					},
				},
			});

			const result = await loadTones.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: "None", value: "None" },
				{ name: "tone_1", value: "tone_1" },
				{ name: "tone_2", value: "tone_2" },
			]);
		});

		it("returns the default tones if the API returns an error", async () => {
			const loadOptionsFunction = createMockLoadOptionsFunctions({
				getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key-123" }),
				helpers: {
					httpRequestWithAuthentication: {
						call: vi.fn().mockResolvedValue({
							body: { error: "Bad Request" },
							statusCode: 400,
						}),
					},
				},
			});

			const result = await loadTones.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: "None", value: "None" },
				{ name: "academic", value: "academic" },
				{ name: "confident", value: "confident" },
				{ name: "conversational", value: "conversational" },
				{ name: "empathetic", value: "empathetic" },
				{ name: "engaging", value: "engaging" },
				{ name: "friendly", value: "friendly" },
				{ name: "professional", value: "professional" },
				{ name: "technical", value: "technical" },
			]);

			expect(LoggerProxy.error).toHaveBeenCalledWith(
				"Couldn't fetch tones from API, using default tones.",
				expect.any(Error),
			);
		});

		it('includes "None" as the first option when API returns tones', async () => {
			const loadOptionsFunction = createMockLoadOptionsFunctions({
				getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key-123" }),
				helpers: {
					httpRequestWithAuthentication: {
						call: vi.fn().mockResolvedValue({
							body: { tones: ["tone_1", "tone_2"] },
							statusCode: 200,
						}),
					},
				},
			});

			const result = await loadTones.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: "None", value: "None" },
				{ name: "tone_1", value: "tone_1" },
				{ name: "tone_2", value: "tone_2" },
			]);
		});
	});

	describe("loadDialects", () => {
		it("returns the dialects from the API", async () => {
			const loadOptionsFunction = createMockLoadOptionsFunctions({
				getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key-123" }),
				helpers: {
					httpRequestWithAuthentication: {
						call: vi.fn().mockResolvedValue({
							body: { dialects: ["english_uk", "english_us"] },
							statusCode: 200,
						}),
					},
				},
			});

			const result = await loadDialects.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: "english_uk", value: "english_uk" },
				{ name: "english_us", value: "english_us" },
			]);
		});

		it("returns the default dialects if the API returns an error", async () => {
			const loadOptionsFunction = createMockLoadOptionsFunctions({
				getCredentials: vi.fn().mockResolvedValue({ apiKey: "mocked-key-123" }),
				helpers: {
					httpRequestWithAuthentication: {
						call: vi.fn().mockResolvedValue({
							body: { error: "Bad Request" },
							statusCode: 400,
						}),
					},
				},
			});

			const result = await loadDialects.call(loadOptionsFunction);

			expect(result).toEqual([
				{ name: "american_english", value: "american_english" },
				{ name: "british_english", value: "british_english" },
				{ name: "canadian_english", value: "canadian_english" },
			]);

			expect(LoggerProxy.error).toHaveBeenCalledWith(
				"Couldn't fetch dialects from API, using default dialects.",
				expect.any(Error),
			);
		});
	});
});
