import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AcrolinxApi implements ICredentialType {
	name = 'AcrolinxApi';
	displayName = 'Acrolinx Rewrite API';
	documentationUrl = 'https://docs.acrolinx.com/overview';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
