import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionTypes,
} from "n8n-workflow";
import { loadDialects, loadStyleGuides, loadTones } from "./utils/load.options";
import { FormDataDetails, getPath, styleRequest } from "./utils/style.api.utils";
import { generateEmailHTMLReport } from "./utils/email.generator";
import { GetStyleRewriteResponse, PostStyleRewriteResponse } from "./Markupai.api.types";

export class Markupai implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Markup AI",
		name: "markupai",
		description: "Markup AI Content Checker",
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
				name: "markupaiApi",
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
					loadOptionsMethod: "loadStyleGuides",
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
						name: "None (Keep Tone Unchanged)",
						value: "None (Keep Tone Unchanged)",
					},
				],
				default: "None (Keep Tone Unchanged)",
				typeOptions: {
					loadOptionsMethod: "loadTones",
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
					loadOptionsMethod: "loadDialects",
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
			loadStyleGuides: loadStyleGuides,
			loadTones: loadTones,
			loadDialects: loadDialects,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		try {
			console.log("Executing Markupai node...");

			const items = this.getInputData();
			const returnData: INodeExecutionData[] = [];

			for (let i = 0; i < items.length; i++) {
				const operation = this.getNodeParameter("operation", i);
				const content = this.getNodeParameter("content", i);
				const styleGuide = this.getNodeParameter("styleGuide", i);
				const tone = this.getNodeParameter("tone", i);
				const dialect = this.getNodeParameter("dialect", i);
				const additionalOptions = this.getNodeParameter("additionalOptions", i) as {
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
					...(tone !== "None (keep tone unchanged)" && { tone }),
					dialect,
					waitForCompletion,
					pollingTimeout,
				} as FormDataDetails;

				const result = await styleRequest.call(this, formDataDetails, getPath(operation), i);

				if (waitForCompletion) {
					const emailHTMLReport = generateEmailHTMLReport(
						result[0].json as unknown as GetStyleRewriteResponse,
						extendedInputData,
					);

					returnData.push({
						json: {
							...(result[0].json as unknown as GetStyleRewriteResponse),
							html_email: emailHTMLReport,
						},
						pairedItem: {
							item: i,
						},
					});
				} else {
					returnData.push({
						json: {
							...(result[0].json as unknown as PostStyleRewriteResponse),
						},
						pairedItem: {
							item: i,
						},
					});
				}
			}

			return [this.helpers.returnJsonArray(returnData)];
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}
