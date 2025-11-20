import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from "n8n-workflow";
import { getBaseUrlString } from "../utils/common.utils";

export const MARKUPAI_API_CREDENTIAL_NAME = "markupaiApi" as const;

export class MarkupAiApi implements ICredentialType {
	name = MARKUPAI_API_CREDENTIAL_NAME;
	displayName = "Markup AI API";
	documentationUrl = "https://docs.markup.ai/";
	properties: INodeProperties[] = [
		{
			displayName: "Markup AI API Key",
			name: "apiKey",
			type: "string",
			typeOptions: { password: true },
			default: "",
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: "generic",
		properties: {
			headers: {
				Authorization: "=Bearer {{$credentials.apiKey}}",
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: getBaseUrlString(),
			url: "/v1/internal/constants",
		},
	};
}
