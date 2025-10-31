import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeApiError,
	NodeOperationError,
} from "n8n-workflow";
import { FormDataDetails, getPath, styleRequest } from "./style.api.utils";
import { generateEmailHTMLReport } from "./email.generator";
import { GetStyleRewriteResponse, PostStyleRewriteResponse } from "../Markupai.api.types";
import {
	getContentType,
	getFileExtensionFromFileName,
	getFileNameExtension,
} from "./filename.extension.resolver";

type AdditionalOptions = {
	waitForCompletion?: boolean;
	pollingTimeout?: number;
	documentName?: string;
	documentOwner?: string;
	documentLink?: string;
};

function addHtmlReportToWorkflowResponse(
	resultElement: INodeExecutionData,
	extendedInputData: {
		document_name: string | undefined;
		document_owner: string | undefined;
		document_link: string | undefined;
	},
	itemIndex: number,
) {
	const emailHTMLReport = generateEmailHTMLReport(
		resultElement.json as unknown as GetStyleRewriteResponse,
		extendedInputData,
	);

	return {
		json: {
			...(resultElement.json as unknown as GetStyleRewriteResponse),
			html_email: emailHTMLReport,
		},
		pairedItem: {
			item: itemIndex,
		},
	};
}

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
	const contentType = additionalOptions.documentName
		? getFileExtensionFromFileName(additionalOptions.documentName)
		: getContentType(content as string);
	const fileNameExtension = getFileNameExtension(contentType);

	return {
		content,
		contentType,
		fileNameExtension,
		styleGuide,
		...(tone !== "None (keep tone unchanged)" && { tone }),
		dialect,
		waitForCompletion,
		pollingTimeout,
	} as FormDataDetails;
}

function createErrorResponse(error: any, itemIndex: number) {
	return {
		json: {
			error: error instanceof NodeApiError ? error.description : error.message,
		},
		pairedItem: {
			item: itemIndex,
		},
	};
}

function createWorkflowResponse(resultElement: INodeExecutionData, itemIndex: number) {
	return {
		json: {
			...(resultElement.json as unknown as PostStyleRewriteResponse),
		},
		pairedItem: {
			item: itemIndex,
		},
	};
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

		const resultElement = result[0];

		if (formDataDetails.waitForCompletion) {
			return addHtmlReportToWorkflowResponse(resultElement, extendedInputData, itemIndex);
		}

		return createWorkflowResponse(resultElement, itemIndex);
	} catch (error) {
		if (this.continueOnFail()) {
			return createErrorResponse(error, itemIndex);
		}

		throw new NodeOperationError(this.getNode(), error as Error, {
			description: error instanceof NodeApiError ? error.description : error.message,
			itemIndex: itemIndex,
		});
	}
}
