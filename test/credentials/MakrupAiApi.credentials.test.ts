import { describe, it, expect, beforeEach } from "vitest";
import { MarkupAiApi } from "../../credentials/MarkupAiApi.credentials";

describe("MarkupAiApi credentials", () => {
	describe("MarkupAiApi class", () => {
		let credentials: MarkupAiApi;

		beforeEach(() => {
			credentials = new MarkupAiApi();
		});

		it("should have correct basic properties", () => {
			const expected = {
				name: "markupaiApi",
				displayName: "Markup AI API",
				documentationUrl: "https://docs.markup.ai/",
			};

			expect({
				name: credentials.name,
				displayName: credentials.displayName,
				documentationUrl: credentials.documentationUrl,
			}).toEqual(expected);
		});

		it("should have correct properties array", () => {
			const expected = [
				{
					displayName: "Markup AI API Key",
					name: "apiKey",
					type: "string",
					typeOptions: { password: true },
					default: "",
					required: true,
				},
				{
					displayName: "Base URL",
					name: "baseUrl",
					type: "string",
					default: "https://api.markup.ai/",
					description: "The base URL for the MarkupAI API",
					placeholder: "e.g. https://api.markup.ai/",
				},
			];

			expect(credentials.properties).toEqual(expected);
		});

		it("should have correct authenticate object", () => {
			const expected = {
				type: "generic",
				properties: {
					headers: {
						Authorization: "=Bearer {{$credentials.apiKey}}",
					},
				},
			};

			expect(credentials.authenticate).toEqual(expected);
		});

		it("should have correct test request object", () => {
			const expected = {
				request: {
					baseURL: "={{$credentials.baseUrl}}",
					url: "/v1/internal/constants",
				},
			};

			expect(credentials.test).toEqual(expected);
		});
	});
});
