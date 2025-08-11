import { describe, it, expect, beforeEach } from 'vitest';
import { AcrolinxApi } from '../../credentials/AcrolinxApi.credentials';

describe('AcrolinxApi credentials', () => {
	describe('AcrolinxApi class', () => {
		let credentials: AcrolinxApi;

		beforeEach(() => {
			credentials = new AcrolinxApi();
		});

		it('should have correct name', () => {
			expect(credentials.name).toBe('acrolinxApi');
		});

		it('should have correct display name', () => {
			expect(credentials.displayName).toBe('Acrolinx API');
		});

		it('should have correct documentation URL', () => {
			expect(credentials.documentationUrl).toBe('https://docs.acrolinx.com/overview');
		});

		it('should have required properties', () => {
			expect(credentials.properties).toHaveLength(2);

			// Check API Key property
			const apiKeyProperty = credentials.properties.find((p) => p.name === 'apiKey');
			expect(apiKeyProperty).toBeDefined();
			expect(apiKeyProperty?.displayName).toBe('Acrolinx API Key');
			expect(apiKeyProperty?.type).toBe('string');
			expect(apiKeyProperty?.required).toBe(true);
			expect(apiKeyProperty?.typeOptions?.password).toBe(true);
			expect(apiKeyProperty?.default).toBe('');

			// Check Base URL property
			const baseUrlProperty = credentials.properties.find((p) => p.name === 'baseUrl');
			expect(baseUrlProperty).toBeDefined();
			expect(baseUrlProperty?.displayName).toBe('Base URL');
			expect(baseUrlProperty?.type).toBe('string');
			expect(baseUrlProperty?.default).toBe('https://app.acrolinx.cloud');
			expect(baseUrlProperty?.description).toBe('The base URL for the Acrolinx API');
			expect(baseUrlProperty?.placeholder).toBe('https://app.acrolinx.cloud');
			expect(baseUrlProperty?.required).toBeUndefined(); // Not required
		});

		it('should have correct property structure', () => {
			const properties = credentials.properties;

			// Check that all properties have required fields
			properties.forEach((property) => {
				expect(property).toHaveProperty('displayName');
				expect(property).toHaveProperty('name');
				expect(property).toHaveProperty('type');
			});
		});

		it('should have API key as first property', () => {
			const firstProperty = credentials.properties[0];
			expect(firstProperty.name).toBe('apiKey');
			expect(firstProperty.displayName).toBe('Acrolinx API Key');
		});

		it('should have base URL as second property', () => {
			const secondProperty = credentials.properties[1];
			expect(secondProperty.name).toBe('baseUrl');
			expect(secondProperty.displayName).toBe('Base URL');
		});

		it('should have correct API key type options', () => {
			const apiKeyProperty = credentials.properties.find((p) => p.name === 'apiKey');
			expect(apiKeyProperty?.typeOptions).toEqual({ password: true });
		});

		it('should have correct base URL default value', () => {
			const baseUrlProperty = credentials.properties.find((p) => p.name === 'baseUrl');
			expect(baseUrlProperty?.default).toBe('https://app.acrolinx.cloud');
		});
	});
});
