import type {
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
} from "n8n-workflow";
import { getBaseUrlString } from "../../../utils/common.utils";
import { listStyleGuides } from "./style_agent_api";
import { assertOk } from "./api.errors";
import type {
  AgentListResult,
  TerminologyDomain,
  TerminologyDomainListResult,
} from "../Markupai.api.types";

const ORCHESTRATOR_AGENT_IDS = new Set(["ag__48WjfPsyKCX", "ag_cnct5nkhtfNk"]);
const STYLE_AGENT_NAME = "style_agent";
const DOMAINS_PATH = "v1/terminology/domains";
const DOMAINS_PAGE_SIZE = 20;

function buildApiUrl(baseUrl: URL, path: string): string {
  const normalizedBaseUrl = new URL(
    baseUrl.toString().endsWith("/") ? baseUrl.toString() : `${baseUrl.toString()}/`,
  );
  return new URL(path, normalizedBaseUrl).toString();
}

export function getBaseUrl(): URL {
  return new URL(getBaseUrlString());
}

function addDomains(
  domainsById: Map<string, TerminologyDomain>,
  listResult: TerminologyDomainListResult,
): void {
  for (const domain of listResult.domains) {
    if (!domain.id) continue;
    domainsById.set(domain.id, {
      id: domain.id,
      name: domain.name,
    });
  }
}

async function fetchAllTerminologyDomains(
  this: ILoadOptionsFunctions,
): Promise<TerminologyDomain[]> {
  const baseUrl = getBaseUrl();
  const domainsById = new Map<string, TerminologyDomain>();

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const httpRequestOptions: IHttpRequestOptions = {
      method: "GET",
      url: buildApiUrl(baseUrl, DOMAINS_PATH),
      qs: {
        page,
        page_size: DOMAINS_PAGE_SIZE,
      },
      returnFullResponse: true,
    };

    const response = (await this.helpers.httpRequestWithAuthentication.call(
      this,
      "markupaiApi",
      httpRequestOptions,
    )) as { statusCode: number; body: unknown };

    assertOk(this.getNode(), response, { method: "GET", url: httpRequestOptions.url });

    const listResult = response.body as TerminologyDomainListResult;
    addDomains(domainsById, listResult);

    totalPages = Math.max(listResult.total_pages, 1);
    page += 1;
  }

  return Array.from(domainsById.values());
}

export async function loadAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const baseUrl = getBaseUrl();

  const httpRequestOptions: IHttpRequestOptions = {
    method: "GET",
    url: buildApiUrl(baseUrl, "agents"),
    qs: { page: 1, page_size: 100 },
    returnFullResponse: true,
  };

  const response = (await this.helpers.httpRequestWithAuthentication.call(
    this,
    "markupaiApi",
    httpRequestOptions,
  )) as { statusCode: number; body: unknown };

  assertOk(this.getNode(), response, { method: "GET", url: httpRequestOptions.url });

  const listResult = response.body as AgentListResult;

  return listResult.agents
    .filter((agent) => !ORCHESTRATOR_AGENT_IDS.has(agent.id))
    .filter((agent) => agent.name === STYLE_AGENT_NAME)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((agent) => ({
      name: agent.name,
      value: agent.id,
      description: agent.description ?? undefined,
    }));
}

export async function loadTerminologyDomains(
  this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
  const domains = await fetchAllTerminologyDomains.call(this);

  return domains
    .map((domain) => ({
      name: domain.name,
      value: domain.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadStyleGuides(
  this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
  const styleGuides = await listStyleGuides.call(this);

  return styleGuides
    .map((styleGuide) => ({
      name: styleGuide.display_name,
      value: styleGuide.id,
    }))
    .sort((a, b) => {
      const aIsDefault = styleGuides.find((sg) => sg.id === a.value)?.is_default ?? false;
      const bIsDefault = styleGuides.find((sg) => sg.id === b.value)?.is_default ?? false;
      if (aIsDefault && !bIsDefault) return -1;
      if (!aIsDefault && bIsDefault) return 1;
      return a.name.localeCompare(b.name);
    });
}
