import { describe, it, expect, beforeEach } from "vitest";
import { MarkupAiApi } from "../../credentials/MarkupAiApi.credentials";

describe("MarkupAiApi credentials", () => {
	describe("MarkupAiApi class", () => {
		let credentials: MarkupAiApi;

		beforeEach(() => {
			credentials = new MarkupAiApi();
		});

		it("should have correct name", () => {
			expect(credentials.name).toBe("markupaiApi");
		});

		it("should have correct display name", () => {
			expect(credentials.displayName).toBe("Markup AI API");
		});

		it("should have correct documentation URL", () => {
			expect(credentials.documentationUrl).toBe("https://docs.markup.ai/");
		});

		it("should have required properties", () => {
			expect(credentials.properties).toHaveLength(2);

			const apiKeyProperty = credentials.properties.find((p) => p.name === "apiKey");
			expect(apiKeyProperty).toBeDefined();
			expect(apiKeyProperty?.displayName).toBe("Markup AI API Key");
			expect(apiKeyProperty?.type).toBe("string");
			expect(apiKeyProperty?.required).toBe(true);
			expect(apiKeyProperty?.typeOptions?.password).toBe(true);
			expect(apiKeyProperty?.default).toBe("");

			const baseUrlProperty = credentials.properties.find((p) => p.name === "baseUrl");
			expect(baseUrlProperty).toBeDefined();
			expect(baseUrlProperty?.displayName).toBe("Base URL");
			expect(baseUrlProperty?.type).toBe("string");
			expect(baseUrlProperty?.default).toBe("https://api.markup.ai/");
			expect(baseUrlProperty?.description).toBe("The base URL for the MarkupAI API");
			expect(baseUrlProperty?.placeholder).toBe("e.g. https://api.markup.ai/");
		});

		it("should have correct property structure", () => {
			const properties = credentials.properties;

			for (const property of properties) {
				expect(property).toHaveProperty("displayName");
				expect(property).toHaveProperty("name");
				expect(property).toHaveProperty("type");
			}
		});

		it("should have API key as first property", () => {
			const firstProperty = credentials.properties[0];
			expect(firstProperty.name).toBe("apiKey");
			expect(firstProperty.displayName).toBe("Markup AI API Key");
		});

		it("should have base URL as second property", () => {
			const secondProperty = credentials.properties[1];
			expect(secondProperty.name).toBe("baseUrl");
			expect(secondProperty.displayName).toBe("Base URL");
		});

		it("should have correct API key type options", () => {
			const apiKeyProperty = credentials.properties.find((p) => p.name === "apiKey");
			expect(apiKeyProperty?.typeOptions).toEqual({ password: true });
		});

		it("should have correct base URL default value", () => {
			const baseUrlProperty = credentials.properties.find((p) => p.name === "baseUrl");
			expect(baseUrlProperty?.default).toBe("https://api.markup.ai/");
		});

		it("should have authenticate object with correct type", () => {
			expect(credentials.authenticate).toBeDefined();
			expect(credentials.authenticate.type).toBe("generic");
		});

		it("should have authenticate properties with headers", () => {
			expect(credentials.authenticate.properties).toBeDefined();
			expect(credentials.authenticate.properties.headers).toBeDefined();
			expect(typeof credentials.authenticate.properties.headers).toBe("object");
		});

		it("should have exactly one header in authenticate properties", () => {
			const headers = credentials.authenticate.properties.headers;
			expect(headers).toBeDefined();
			const headerKeys = Object.keys(headers!);
			expect(headerKeys).toHaveLength(1);
		});

		it("should have Authorization header with correct value", () => {
			const headers = credentials.authenticate.properties.headers;
			expect(headers).toBeDefined();
			expect(headers!.Authorization).toBe("=Bearer {{$credentials.apiKey}}");
		});

		it("should have test object defined", () => {
			expect(credentials.test).toBeDefined();
		});

		it("should have test request object", () => {
			expect(credentials.test.request).toBeDefined();
		});

		it("should have correct baseURL in test request", () => {
			expect(credentials.test.request.baseURL).toBe("={{$credentials.baseUrl}}");
		});

		it("should have correct url in test request", () => {
			expect(credentials.test.request.url).toBe("/v1/internal/constants");
		});
	});
});
