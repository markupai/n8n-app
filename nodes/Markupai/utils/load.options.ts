import type {
	FunctionsBase,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from "n8n-workflow";
import { LoggerProxy } from "n8n-workflow";
import { StyleGuides } from "../Markupai.api.types";

type Constants = {
	dialects: string[];
	tones: string[];
};

const DEFAULT_CONSTANTS = {
	dialects: ["american_english", "british_english", "canadian_english"],
	tones: [
		"academic",
		"confident",
		"conversational",
		"empathetic",
		"engaging",
		"friendly",
		"professional",
		"technical",
	],
};

const appendDefaultTone = (tones: string[]) => {
	return ["None", ...tones];
};

const mapTones = (tones: string[]) => {
	return appendDefaultTone(tones).map((tone) => ({
		name: tone,
		value: tone,
	}));
};

export async function getBaseUrl(functionsBase: FunctionsBase): Promise<URL> {
	const credentials = await functionsBase.getCredentials("markupaiApi");

	return new URL(credentials.baseUrl);
}

export async function loadStyleGuides(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const baseUrl = await getBaseUrl(this);

		const httpRequestOptions: IHttpRequestOptions = {
			method: "GET",
			url: `${baseUrl.toString()}v1/style-guides`,
			returnFullResponse: true,
		};

		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			"markupaiApi",
			httpRequestOptions,
		);

		if (response.statusCode !== 200) {
			throw new Error("Error loading style guides: " + response.body);
		}

		const styleGuides = response.body as StyleGuides;

		if (!styleGuides) {
			throw new Error("Error loading style guides: empty response");
		}

		return styleGuides.map((styleGuide) => ({
			name: styleGuide.name,
			value: styleGuide.id,
		}));
	} catch (error) {
		throw new Error("Error loading style guides", error as Error);
	}
}

async function getConstants(this: ILoadOptionsFunctions | IExecuteFunctions): Promise<Constants> {
	const baseUrl = await getBaseUrl(this);

	const requestOptions: IHttpRequestOptions = {
		method: "GET",
		url: `${baseUrl.toString()}v1/internal/constants`,
		returnFullResponse: true,
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		"markupaiApi",
		requestOptions,
	);

	if (response.statusCode !== 200) {
		throw new Error(JSON.parse(response.body as string).error);
	}

	return {
		...response.body,
	} as Constants;
}

export async function loadTones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const constants = await getConstants.call(this);

		return mapTones(constants.tones);
	} catch (error) {
		LoggerProxy.error("Couldn't fetch tones from API, using default tones.", error);
		return mapTones(DEFAULT_CONSTANTS.tones);
	}
}

export async function loadDialects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const constants = await getConstants.call(this);

		return constants.dialects.map((dialect: string) => ({
			name: dialect,
			value: dialect,
		}));
	} catch (error) {
		LoggerProxy.error("Couldn't fetch dialects from API, using default dialects.", error);
		return DEFAULT_CONSTANTS.dialects.map((dialect: string) => ({
			name: dialect,
			value: dialect,
		}));
	}
}
