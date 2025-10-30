import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeApiError,
	NodeOperationError,
} from "n8n-workflow";
import { FormDataDetails, getPath, styleRequest } from "./style.api.utils";
import { generateEmailHTMLReport } from "./email.generator";
import { GetStyleRewriteResponse, PostStyleRewriteResponse } from "../Markupai.api.types";

type AdditionalOptions = {
	waitForCompletion?: boolean;
	pollingTimeout?: number;
	documentName?: string;
	documentOwner?: string;
	documentLink?: string;
};

function buildFormDataDetails(
	this: IExecuteFunctions,
	itemIndex: number,
	additionalOptions: AdditionalOptions,
): FormDataDetails {
	const content = this.getNodeParameter("content", itemIndex);
	const styleGuide = this.getNodeParameter("styleGuide", itemIndex);
	const tone = this.getNodeParameter("tone", itemIndex);
	const dialect = this.getNodeParameter("dialect", itemIndex);
	const waitForCompletion = additionalOptions.waitForCompletion ?? true;
	const pollingTimeout = additionalOptions.pollingTimeout || 60000;

	return {
		content,
		styleGuide,
		...(tone !== "None (keep tone unchanged)" && { tone }),
		dialect,
		waitForCompletion,
		pollingTimeout,
	} as FormDataDetails;
}

export async function processMarkupaiItem(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	try {
		const operation = this.getNodeParameter("operation", itemIndex);
		const additionalOptions = this.getNodeParameter(
			"additionalOptions",
			itemIndex,
		) as AdditionalOptions;
		const formDataDetails = buildFormDataDetails.call(this, itemIndex, additionalOptions);

		const extendedInputData = {
			document_name: additionalOptions.documentName,
			document_owner: additionalOptions.documentOwner,
			document_link: additionalOptions.documentLink,
		};

		const result = await styleRequest.call(this, formDataDetails, getPath(operation), itemIndex);

		if (formDataDetails.waitForCompletion) {
			const emailHTMLReport = generateEmailHTMLReport(
				result[0].json as unknown as GetStyleRewriteResponse,
				extendedInputData,
			);

			return {
				json: {
					...(result[0].json as unknown as GetStyleRewriteResponse),
					html_email: emailHTMLReport,
				},
				pairedItem: {
					item: itemIndex,
				},
			};
		} else {
			return {
				json: {
					...(result[0].json as unknown as PostStyleRewriteResponse),
				},
				pairedItem: {
					item: itemIndex,
				},
			};
		}
	} catch (error) {
		if (this.continueOnFail()) {
			return {
				json: {
					error: error instanceof NodeApiError ? error.description : error.message,
				},
				pairedItem: {
					item: itemIndex,
				},
			};
		}

		throw new NodeOperationError(this.getNode(), error as Error, {
			description: error instanceof NodeApiError ? error.description : error.message,
			itemIndex: itemIndex,
		});
	}
}
