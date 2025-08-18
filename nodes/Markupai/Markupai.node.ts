import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionType,
} from 'n8n-workflow';
import { loadDialects, loadStyleGuides, loadTones } from './utils/load.options';
import { FormDataDetails, getPath, styleRequest } from './utils/style.api.utils';
import { generateEmailHTMLReport } from './utils/email.generator';
import { GetStyleRewriteResponse } from './Markupai.api.types';

export class MarkupAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MarkupAI',
		name: 'markupai',
		description: 'MarkupAI AI Content Checker',
		icon: 'file:markupai.svg',
		version: 1,
		defaults: {
			name: 'MarkupAI',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		group: [],
		credentials: [
			{
				name: 'markupaiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Style Check',
						value: 'styleCheck',
					},
					{
						name: 'Rewrite',
						value: 'rewrite',
					},
				],
				default: 'styleCheck',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Style Guide Name or ID',
				name: 'styleGuide',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				options: [],
				default: '',
				typeOptions: {
					loadOptionsMethod: 'loadStyleGuides',
				},
			},
			{
				displayName: 'Tone Name or ID',
				name: 'tone',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				options: [],
				default: '',
				typeOptions: {
					loadOptionsMethod: 'loadTones',
				},
			},
			{
				displayName: 'Dialect Name or ID',
				name: 'dialect',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				options: [],
				default: '',
				typeOptions: {
					loadOptionsMethod: 'loadDialects',
				},
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Document Link',
						name: 'documentLink',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Document Name',
						name: 'documentName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Document Owner',
						name: 'documentOwner',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Polling Timeout (Ms)',
						name: 'pollingTimeout',
						type: 'number',
						default: 60000,
						description: 'Maximum time to wait for workflow completion in milliseconds',
						displayOptions: {
							show: {
								waitForCompletion: [true],
							},
						},
					},
					{
						displayName: 'Wait For Completion',
						name: 'waitForCompletion',
						type: 'boolean',
						default: true,
						description: 'Whether to wait for the workflow to complete before returning',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			loadStyleGuides: loadStyleGuides,
			loadTones: loadTones,
			loadDialects: loadDialects,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		try {
			const items = this.getInputData();
			const returnData: INodeExecutionData[] = [];

			for (let i = 0; i < items.length; i++) {
				const operation = this.getNodeParameter('operation', i) as string;
				const content = this.getNodeParameter('content', i) as string;
				const styleGuide = this.getNodeParameter('styleGuide', i) as string;
				const tone = this.getNodeParameter('tone', i) as string;
				const dialect = this.getNodeParameter('dialect', i) as string;
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
					waitForCompletion?: boolean;
					pollingTimeout?: number;
					documentName?: string;
					documentOwner?: string;
					documentLink?: string;
				};
				const waitForCompletion = additionalOptions.waitForCompletion ?? true;
				const pollingTimeout = additionalOptions.pollingTimeout || 60000;
				const extendedInputData = {
					document_name: additionalOptions.documentName,
					document_owner: additionalOptions.documentOwner,
					document_link: additionalOptions.documentLink,
				};

				const formDataDetails = {
					content,
					styleGuide,
					tone,
					dialect,
					waitForCompletion,
					pollingTimeout,
				} as FormDataDetails;

				const path = getPath(operation);

				const result = await styleRequest(this, formDataDetails, path, i);

				if (waitForCompletion) {
					const emailHTMLReport = generateEmailHTMLReport(
						result[0].json as unknown as GetStyleRewriteResponse,
						extendedInputData,
					);

					returnData.push({
						json: {
							...result[0].json,
							html_email: emailHTMLReport,
						},
						itemData: i,
					});
				} else {
					returnData.push({
						json: {
							...result[0].json,
						},
						itemData: i,
					});
				}
			}

			return [this.helpers.returnJsonArray(returnData)];
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}
