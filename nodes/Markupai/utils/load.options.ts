import type {
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
} from "n8n-workflow";
import { getBaseUrlString } from "../../../utils/common.utils";
import type { AgentListResult } from "../Markupai.api.types";

export function getBaseUrl(): URL {
  return new URL(getBaseUrlString());
}

function stringifyResponseBody(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }

  if (typeof body === "object" && body !== null) {
    return JSON.stringify(body);
  }

  return String(body);
}

export async function loadAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const baseUrl = getBaseUrl();

  const httpRequestOptions: IHttpRequestOptions = {
    method: "GET",
    url: `${baseUrl.toString()}agents`,
    qs: { page: 1, page_size: 100 },
    returnFullResponse: true,
  };

  const response = (await this.helpers.httpRequestWithAuthentication.call(
    this,
    "markupaiApi",
    httpRequestOptions,
  )) as { statusCode: number; body: unknown };

  if (response.statusCode !== 200) {
    const bodyStr = stringifyResponseBody(response.body);
    throw new Error("Error loading agents: " + bodyStr);
  }

  const listResult = response.body as AgentListResult;

  return listResult.agents.map((agent) => ({
    name: agent.name,
    value: agent.id,
    description: agent.description ?? undefined,
  }));
}
