import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MarkupAiApi implements ICredentialType {
	name = 'markupaiApi';
	displayName = 'MarkupAI API';
	documentationUrl = 'https://docs.markup.ai/';
	properties: INodeProperties[] = [
		{
			displayName: 'MarkupAI API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.markup.ai',
			description: 'The base URL for the MarkupAI API',
			placeholder: 'https://api.markup.ai',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'OpenAI-Organization': '={{$credentials.organizationId}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/internal/constants',
		},
	};
}
