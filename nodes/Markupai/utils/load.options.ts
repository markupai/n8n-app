import type {
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
} from "n8n-workflow";
import { getBaseUrlString } from "../../../utils/common.utils";
import type { AgentListResult } from "../Markupai.api.types";

const ORCHESTRATOR_AGENT_IDS = new Set(["ag__48WjfPsyKCX", "ag_cnct5nkhtfNk"]);

export function getBaseUrl(): URL {
  return new URL(getBaseUrlString());
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
    let bodyStr: string;
    if (typeof response.body === "string") {
      bodyStr = response.body;
    } else if (typeof response.body === "object" && response.body !== null) {
      bodyStr = JSON.stringify(response.body);
    } else {
      bodyStr = String(response.body);
    }
    throw new Error("Error loading agents: " + bodyStr);
  }

  const listResult = response.body as AgentListResult;

  return listResult.agents
    .filter((agent) => !ORCHESTRATOR_AGENT_IDS.has(agent.id))
    .map((agent) => ({
      name: agent.name,
      value: agent.id,
      description: agent.description ?? undefined,
    }));
}
