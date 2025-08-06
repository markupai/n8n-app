import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AcrolinxApi implements ICredentialType {
	name = 'acrolinxApi';
	displayName = 'Acrolinx API';
	documentationUrl = 'https://docs.acrolinx.com/overview';
	properties: INodeProperties[] = [
		{
			displayName: 'Acrolinx API Key',
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
			description: 'The base URL for the Acrolinx API',
			placeholder: 'https://app.acrolinx.cloud',
		},
	];
}
