import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MarkupAiApi implements ICredentialType {
	name = 'markupaiApi';
	displayName = 'MarkupAI API';
	documentationUrl = 'https://docs.acrolinx.com/overview';
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
			default: 'https://app.acrolinx.cloud',
			description: 'The base URL for the MarkupAI API',
			placeholder: 'https://app.acrolinx.cloud',
		},
	];
}
