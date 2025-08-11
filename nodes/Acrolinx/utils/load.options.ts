import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { StyleGuides } from '../Acrolinx.api.types';

type Constants = {
	dialects: string[];
	tones: string[];
};

const DEFAULT_CONSTANTS = {
	dialects: [
		'american_english',
		'australian_english',
		'british_oxford',
		'canadian_english',
		'indian_english',
	],
	tones: [
		'academic',
		'business',
		'casual',
		'conversational',
		'formal',
		'gen-z',
		'informal',
		'technical',
	],
};

export async function getApiKey(fn: ILoadOptionsFunctions | IExecuteFunctions): Promise<string> {
	const credentials: ICredentialDataDecryptedObject = (await fn.getCredentials('acrolinxApi')) as {
		apiKey: string;
	};

	return credentials.apiKey as string;
}

export async function getBaseUrl(fn: ILoadOptionsFunctions | IExecuteFunctions): Promise<string> {
	const credentials: ICredentialDataDecryptedObject = (await fn.getCredentials('acrolinxApi')) as {
		baseUrl: string;
	};

	return credentials.baseUrl as string;
}

export async function loadStyleGuides(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const apiKey = await getApiKey(this);
		const baseUrl = await getBaseUrl(this);

		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: `${baseUrl}/v1/style-guides`,
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
			returnFullResponse: true,
		};

		const response = await this.helpers.httpRequest(requestOptions);

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
		url: `${baseUrl}/v1/internal/constants`,
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
		returnFullResponse: true,
	};

	const response = await fn.helpers.httpRequest(requestOptions);

	if (response.statusCode !== 200) {
		console.log('error loading constants: ', response.body);
		throw new Error(JSON.parse(response.body as string).error);
	}

	return {
		...response.body,
	} as Constants;
}

export async function loadTones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const constants = await getConstants(this);

		return constants.tones.map((tone: string) => ({
			name: tone,
			value: tone,
		}));
	} catch (error) {
		return DEFAULT_CONSTANTS.tones.map((tone: string) => ({
			name: tone,
			value: tone,
		}));
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
