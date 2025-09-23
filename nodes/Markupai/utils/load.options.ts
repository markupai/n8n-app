import type {
	FunctionsBase,
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { StyleGuides } from '../Markupai.api.types';

type Constants = {
	dialects: string[];
	tones: string[];
};

const DEFAULT_CONSTANTS = {
	dialects: ['american_english', 'british_english', 'canadian_english'],
	tones: [
		'academic',
		'confident',
		'conversational',
		'empathetic',
		'engaging',
		'friendly',
		'professional',
		'technical',
	],
};

const appendDefaultTone = (tones: string[]) => {
	return ['None (Keep Tone Unchanged)', ...tones];
};

const mapTones = (tones: string[]) => {
	return appendDefaultTone(tones).map((tone) => ({
		name: tone,
		value: tone,
	}));
};

export async function getApiKey(functionsBase: FunctionsBase): Promise<string> {
	const credentials: ICredentialDataDecryptedObject =
		await functionsBase.getCredentials('markupaiApi');

	return credentials.apiKey as string;
}

export async function getBaseUrl(functionsBase: FunctionsBase): Promise<URL> {
	const credentials = await functionsBase.getCredentials('markupaiApi');

	return new URL(credentials.baseUrl);
}

export async function loadStyleGuides(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const apiKey = await getApiKey(this);
		const baseUrl = await getBaseUrl(this);

		const httpRequestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: `${baseUrl.toString()}v1/style-guides`,
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
			returnFullResponse: true,
		};

		const response = await this.helpers.httpRequest(httpRequestOptions);

		if (response.statusCode !== 200) {
			throw new Error('Error loading style guides: ' + response.body);
		}

		const styleGuides = response.body as StyleGuides;

		if (!styleGuides) {
			throw new Error('Error loading style guides: empty response');
		}

		return styleGuides.map((styleGuide) => ({
			name: styleGuide.name,
			value: styleGuide.id,
		}));
	} catch (error) {
		throw new Error('Error loading style guides', error as Error);
	}
}

async function getConstants(fn: ILoadOptionsFunctions | IExecuteFunctions): Promise<Constants> {
	const apiKey = await getApiKey(fn);
	const baseUrl = await getBaseUrl(fn);

	const requestOptions: IHttpRequestOptions = {
		method: 'GET',
		url: `${baseUrl.toString()}v1/internal/constants`,
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
		returnFullResponse: true,
	};

	const response = await fn.helpers.httpRequest(requestOptions);

	if (response.statusCode !== 200) {
		throw new Error(JSON.parse(response.body as string).error);
	}

	return {
		...response.body,
	} as Constants;
}

export async function loadTones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const constants = await getConstants(this);

		return mapTones(constants.tones);
	} catch (error) {
		return mapTones(DEFAULT_CONSTANTS.tones);
	}
}

export async function loadDialects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const constants = await getConstants(this);

		return constants.dialects.map((dialect: string) => ({
			name: dialect,
			value: dialect,
		}));
	} catch (error) {
		return DEFAULT_CONSTANTS.dialects.map((dialect: string) => ({
			name: dialect,
			value: dialect,
		}));
	}
}
