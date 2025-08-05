import {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
	INodePropertyOptions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';
import { StyleGuides } from '../Acrolinx.api.types';

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
	const node: INode = this.getNode();

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
			throw new NodeApiError(node, JSON.parse(response.response.data as string).error);
		}

		const styleGuides = response.body as StyleGuides;

		if (!styleGuides) {
			throw new NodeApiError(node, response.body as JsonObject);
		}

		return styleGuides.map((styleGuide) => ({
			name: styleGuide.name,
			value: styleGuide.id,
		}));
	} catch (error) {
		throw new NodeApiError(node, error as JsonObject);
	}
}

export async function loadTones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return DEFAULT_CONSTANTS.tones.map((tone: string) => ({
		name: tone,
		value: tone,
	}));
}

export async function loadDialects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return DEFAULT_CONSTANTS.dialects.map((dialect: string) => ({
		name: dialect,
		value: dialect,
	}));
}
