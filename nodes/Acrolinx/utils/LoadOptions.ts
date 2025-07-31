import {
	Config,
	Environment,
	getAdminConstants,
	listStyleGuides,
	PlatformConfig,
	PlatformType,
} from '@acrolinx/typescript-sdk';
import {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodePropertyOptions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

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

export async function getConfig(fn: ILoadOptionsFunctions | IExecuteFunctions): Promise<Config> {
	const credentials: ICredentialDataDecryptedObject = (await fn.getCredentials('acrolinxApi')) as {
		apiKey: string;
	};

	const platformConfig: PlatformConfig | undefined = {
		type: PlatformType.Environment,
		value: Environment.Dev,
	};

	const config: Config = {
		apiKey: credentials.apiKey as string,
		...(platformConfig && { platform: platformConfig }),
	};

	return config;
}

export async function loadStyleGuides(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const node: INode = this.getNode();

	try {
		const config = await getConfig(this);
		const styleGuides = await listStyleGuides(config);

		return styleGuides.map((styleGuide) => ({
			name: styleGuide.name,
			value: styleGuide.id,
		}));
	} catch (error) {
		throw new NodeApiError(node, error as JsonObject);
	}
}

export async function loadTones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const config = await getConfig(this);
		const constants = await getAdminConstants(config);

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
		const config = await getConfig(this);
		const constants = await getAdminConstants(config);

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
