import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionType,
} from 'n8n-workflow';
import { getConfig, loadDialects, loadStyleGuides, loadTones } from './utils/LoadOptions';
import {
	AcrolinxError,
	StyleAnalysisRewriteResp,
	StyleAnalysisSuccessResp,
	styleCheck,
	styleRewrite,
} from '@acrolinx/typescript-sdk';
import { generateEmailHTMLReport } from './utils/EmailGenerator';

type OperationType = 'styleCheck' | 'rewrite';

export class Acrolinx implements INodeType {
	description: INodeTypeDescription = {
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
						displayName: 'Document Link',
						name: 'documentLink',
						type: 'string',
						default: '',
					},
				],
			},
		],
		version: 1,
		defaults: {
			name: 'Acrolinx',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		displayName: 'Acrolinx',
		name: 'acrolinx',
		icon: 'file:acrolinx.png',
		group: [],
		description: 'Acrolinx AI Content Checker',
		credentials: [
			{
				name: 'acrolinxApi',
				required: true,
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
			const operation = this.getNodeParameter('operation', 0) as OperationType;
			const content = this.getNodeParameter('content', 0) as string;
			const styleGuide = this.getNodeParameter('styleGuide', 0) as string;
			const tone = this.getNodeParameter('tone', 0) as string;
			const dialect = this.getNodeParameter('dialect', 0) as string;
			const additionalOptions = this.getNodeParameter('additionalOptions', 0) as {
				documentName: string;
				documentOwner: string;
				documentLink: string;
			};

			const parameters = {
				content,
				style_guide: styleGuide,
				tone,
				dialect,
			};

			const config = await getConfig(this);

			let executionData: INodeExecutionData[];

			if (operation === 'rewrite') {
				const result: StyleAnalysisRewriteResp = await styleRewrite(parameters, config);
				const documentMetadata = {
					document_name: additionalOptions?.documentName,
					document_owner: additionalOptions?.documentOwner,
					document_link: additionalOptions?.documentLink,
				};
				const htmlReport = generateEmailHTMLReport(result, documentMetadata);
				const { issues, ...resultWithoutIssues } = result;
				const responseData = {
					...resultWithoutIssues,
					html_email: htmlReport,
				};

				executionData = [{ json: responseData }];
			} else {
				const result: StyleAnalysisSuccessResp = await styleCheck(parameters, config);

				executionData = [
					{
						json: {
							...result,
						},
					},
				];
			}

			return [this.helpers.returnJsonArray(executionData)];
		} catch (error) {
			if (error instanceof AcrolinxError) {
				throw new NodeApiError(this.getNode(), {
					message: error.message as string,
					statusCode: error.statusCode as number,
					type: error.type as string,
				});
			}
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}
