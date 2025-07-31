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
	Issue,
	StyleAnalysisRewriteResp,
	styleRewrite,
} from '@acrolinx/typescript-sdk';
import { generateEmailHTMLReport } from './utils/EmailGenerator';

type OmitIssues<T> = T extends { issues: Issue[] } ? Omit<T, 'issues'> : T;

export class Acrolinx implements INodeType {
	description: INodeTypeDescription = {
		properties: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Style Guide',
				name: 'styleGuide',
				type: 'options',
				options: [],
				default: '',
				typeOptions: {
					loadOptionsMethod: 'loadStyleGuides',
				},
			},
			{
				displayName: 'Tone',
				name: 'tone',
				type: 'options',
				options: [],
				default: '',
				typeOptions: {
					loadOptionsMethod: 'loadTones',
				},
			},
			{
				displayName: 'Dialect',
				name: 'dialect',
				type: 'options',
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
                        required: false,
                        default: '',
                    },
                    {
                        displayName: 'Document Owner',
                        name: 'documentOwner',
                        type: 'string',
                        required: false,
                        default: '',
                    },
                    {
                        displayName: 'Document Link',
                        name: 'documentLink',
                        type: 'string',
                        required: false,
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
		name: 'Acrolinx',
		icon: 'file:acrolinx.png',
		group: [],
		description: 'Acrolinx AI Content Checker',
		credentials: [
			{
				name: 'AcrolinxApi',
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
			const content = this.getNodeParameter('content', 0) as string;
			const styleGuide = this.getNodeParameter('styleGuide', 0) as string;
			const tone = this.getNodeParameter('tone', 0) as string;
			const dialect = this.getNodeParameter('dialect', 0) as string;
            const additionalOptions = this.getNodeParameter('additionalOptions', 0) as {
                documentName: string;
                documentOwner: string;
                documentLink: string;
            };

			const config = await getConfig(this);

			const result: StyleAnalysisRewriteResp = await styleRewrite(
				{
					content: content,
					style_guide: styleGuide,
					tone: tone,
					dialect: dialect,
				},
				config,
			);

			const htmlReport: string = generateEmailHTMLReport(result, {
                document_name: additionalOptions?.documentName,
                document_owner: additionalOptions?.documentOwner,
                document_link: additionalOptions?.documentLink,
            });

			const resultWithoutIssues = Object.fromEntries(
				Object.entries(result).filter(([key]) => key !== 'issues'),
			) as OmitIssues<typeof result>;

			const returnData: INodeExecutionData[] = [];

			returnData.push({
				json: {
					...resultWithoutIssues,
					html_email: htmlReport,
				},
			});

			return [this.helpers.returnJsonArray(returnData)];
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
