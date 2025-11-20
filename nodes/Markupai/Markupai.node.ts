import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
} from "n8n-workflow";
import { MARKUPAI_API_CREDENTIAL_NAME } from "../../credentials/MarkupAiApi.credentials";
import { loadDialects, loadStyleGuides, loadTones } from "./utils/load.options";
import { processMarkupaiItem } from "./utils/process.item";

const LOAD_STYLE_GUIDES = "loadStyleGuides" as const;
const LOAD_TONES = "loadTones" as const;
const LOAD_DIALECTS = "loadDialects" as const;

export class Markupai implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Markup AI",
		name: "markupai",
		description: "Markup AI Content Guardian",
		icon: "file:markupai.svg",
		version: 1,
		defaults: {
			name: "Markup AI",
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		group: [],
		credentials: [
			{
				name: MARKUPAI_API_CREDENTIAL_NAME,
				required: true,
			},
		],
		properties: [
			{
				displayName: "Resource",
				name: "resource",
				type: "options",
				noDataExpression: true,
				options: [
					{
						name: "Content",
						value: "content",
					},
				],
				default: "content",
			},
			{
				displayName: "Operation",
				name: "operation",
				type: "options",
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ["content"],
					},
				},
				options: [
					{
						name: "Style Check",
						value: "styleCheck",
						action: "Content style check",
						description: "Check the content against your style and branding guidelines",
					},
					{
						name: "Style Rewrite",
						value: "styleRewrite",
						action: "Content style rewrite",
						description: "Rewrite the content against your style and branding guidelines",
					},
				],
				default: "styleCheck",
			},
			{
				displayName: "Content",
				name: "content",
				type: "string",
				typeOptions: {
					rows: 10,
				},
				required: true,
				default: "",
			},
			{
				displayName: "Style Guide Name or ID",
				name: "styleGuide",
				type: "options",
				noDataExpression: true,
				description:
					'Select style guide. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				options: [],
				default: "",
				typeOptions: {
					loadOptionsMethod: LOAD_STYLE_GUIDES,
				},
			},
			{
				displayName: "Tone Name or ID",
				name: "tone",
				type: "options",
				noDataExpression: true,
				description:
					'Select tone. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				options: [
					{
						name: "None",
						value: "None",
					},
				],
				default: "None",
				typeOptions: {
					loadOptionsMethod: LOAD_TONES,
				},
			},
			{
				displayName: "Dialect Name or ID",
				name: "dialect",
				type: "options",
				description:
					'Select dialect. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				noDataExpression: true,
				options: [],
				default: "",
				typeOptions: {
					loadOptionsMethod: LOAD_DIALECTS,
				},
			},
			{
				displayName: "Additional Options",
				name: "additionalOptions",
				type: "collection",
				placeholder: "Add Option",
				default: {},
				options: [
					{
						displayName: "Document Link",
						name: "documentLink",
						type: "string",
						default: "",
						description: "URL or link to the original document",
					},
					{
						displayName: "Document Name",
						name: "documentName",
						type: "string",
						default: "",
						description: "Name of the document being checked",
					},
					{
						displayName: "Document Owner",
						name: "documentOwner",
						type: "string",
						default: "",
						description: "Name of the document owner",
					},
					{
						displayName: "Polling Timeout (Ms)",
						name: "pollingTimeout",
						type: "number",
						default: 60000,
						description: "Maximum time to wait for workflow completion in milliseconds",
						displayOptions: {
							show: {
								waitForCompletion: [true],
							},
						},
					},
					{
						displayName: "Wait For Completion",
						name: "waitForCompletion",
						type: "boolean",
						default: true,
						description: "Whether to wait for the workflow to complete before returning",
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			[LOAD_STYLE_GUIDES]: loadStyleGuides,
			[LOAD_TONES]: loadTones,
			[LOAD_DIALECTS]: loadDialects,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const result = await processMarkupaiItem.call(this, i);

			returnData.push(result);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
