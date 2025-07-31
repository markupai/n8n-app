import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AcrolinxApi implements ICredentialType {
	name = 'acrolinxApi';
	displayName = 'Acrolinx API';
	documentationUrl = 'https://docs.acrolinx.com/overview';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
