import { IExecuteFunctions, IHttpRequestOptions, INodeExecutionData, sleep } from "n8n-workflow";
import { getApiKey, getBaseUrl } from "./load.options";
import { GetStyleRewriteResponse, PostStyleRewriteResponse } from "../Markupai.api.types";

export interface FormDataDetails {
	content: string;
	dialect: string;
	tone: string;
	styleGuide: string;
	documentName?: string;
	documentOwner?: string;
	documentLink?: string;
	waitForCompletion: boolean;
	pollingTimeout: number;
}

export async function postStyleRewrite(
	fn: IExecuteFunctions,
	formDataDetails: FormDataDetails,
	path: string,
): Promise<PostStyleRewriteResponse> {
	const formData = new FormData();
	const apiKey = await getApiKey(fn);
	const baseUrl = await getBaseUrl(fn);

	const blob = new Blob([formDataDetails.content], { type: "text/plain" });

	formData.append("file_upload", blob, formDataDetails.documentName || "content.txt");
	formData.append("dialect", formDataDetails.dialect);
	formData.append("tone", formDataDetails.tone);
	formData.append("style_guide", formDataDetails.styleGuide);

	const requestOptions: IHttpRequestOptions = {
		method: "POST",
		url: `${baseUrl.toString()}${path}`,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "multipart/form-data",
		},
		body: formData,
		returnFullResponse: true,
	};

	const response = await fn.helpers.httpRequest(requestOptions);

	const submitResponse =
		typeof response.body === "string" ? response.body : JSON.stringify(response.body);

	return JSON.parse(submitResponse);
}

export async function pollResponse(
	fn: IExecuteFunctions,
	styleRewriteResponse: PostStyleRewriteResponse,
	waitForCompletion: boolean,
	pollingTimeout: number,
	path: string,
): Promise<GetStyleRewriteResponse> {
	const baseUrl = await getBaseUrl(fn);
	const apiKey = await getApiKey(fn);
	let result: any = {
		...styleRewriteResponse,
	};

	if (result.status === "running" && waitForCompletion) {
		const pollingInterval = 2000;

		const startTime = Date.now();

		while (result.status === "running") {
			if (Date.now() - startTime > pollingTimeout) {
				throw new Error(
					`Workflow timeout after ${pollingTimeout}ms. Workflow ID: ${styleRewriteResponse.workflow_id}`,
				);
			}

			await sleep(pollingInterval);

			const statusOptions: IHttpRequestOptions = {
				method: "GET",
				url: `${baseUrl.toString()}${path}/${styleRewriteResponse.workflow_id}`,
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
				returnFullResponse: true,
			};

			const statusResp = await fn.helpers.httpRequest(statusOptions);
			const statusResponse =
				typeof statusResp.body === "string" ? statusResp.body : JSON.stringify(statusResp.body);

			const responseBody = JSON.parse(statusResponse);

			result = {
				status: responseBody.workflow.status,
				...responseBody,
			};
		}

		if (result.status === "failed") {
			throw new Error(`Workflow failed: ${result.workflow.id}}`);
		}
	}

	return result;
}

export async function styleRequest(
	fn: IExecuteFunctions,
	formDataDetails: FormDataDetails,
	path: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const postStyleRewriteResponse = await postStyleRewrite(fn, formDataDetails, path);

	if (formDataDetails.waitForCompletion) {
		const pollStyleRewriteResponseComplete = await pollResponse(
			fn,
			postStyleRewriteResponse,
			formDataDetails.waitForCompletion,
			formDataDetails.pollingTimeout,
			path,
		);

		const { status, ...responseWithoutStatus } = pollStyleRewriteResponseComplete as any;

		returnData.push({
			json: { ...responseWithoutStatus },
			itemData: itemIndex,
		});
	} else {
		returnData.push({
			json: { ...postStyleRewriteResponse },
			itemData: itemIndex,
		});
	}

	return returnData;
}

export function getPath(operation: string): string {
	if (operation === "styleRewrite") {
		return "v1/style/rewrites";
	} else {
		return "v1/style/checks";
	}
}
