import type { IExecuteFunctions, IHttpRequestOptions, ILoadOptionsFunctions } from "n8n-workflow";
import { getBaseUrl } from "./load.options";
import { assertOk } from "./api.errors";
import type { OrganizationConfigResponse, StyleGuide } from "../Markupai.api.types";

const CONFIG_PATH = "style-agent/config";
const STYLE_GUIDES_PATH = "style-agent/style-guides";

export const STYLE_AGENT_DISABLED_MESSAGE =
  "Style Agent is not enabled for your organization. Contact Markup AI support to enable it.";

const ENABLED_STYLE_AGENT_MODES: ReadonlySet<string> = new Set(["enabled", "enabled_terminology"]);

type StyleAgentApiContext = IExecuteFunctions | ILoadOptionsFunctions;

function buildApiUrl(baseUrl: URL, path: string): string {
  const normalizedBaseUrl = new URL(
    baseUrl.toString().endsWith("/") ? baseUrl.toString() : `${baseUrl.toString()}/`,
  );
  return new URL(path, normalizedBaseUrl).toString();
}

async function getJson<T>(context: StyleAgentApiContext, path: string): Promise<T> {
  const requestOptions: IHttpRequestOptions = {
    method: "GET",
    url: buildApiUrl(getBaseUrl(), path),
    returnFullResponse: true,
  };
  const response = (await context.helpers.httpRequestWithAuthentication.call(
    context,
    "markupaiApi",
    requestOptions,
  )) as { statusCode: number; body: unknown };

  assertOk(context.getNode(), response, { method: "GET", url: requestOptions.url });

  const bodyStr = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
  return JSON.parse(bodyStr) as T;
}

export async function getStyleAgentConfig(
  this: StyleAgentApiContext,
): Promise<OrganizationConfigResponse> {
  return getJson<OrganizationConfigResponse>(this, CONFIG_PATH);
}

export function assertStyleAgentEnabled(config: OrganizationConfigResponse): void {
  if (!ENABLED_STYLE_AGENT_MODES.has(config.style_agent)) {
    throw new Error(STYLE_AGENT_DISABLED_MESSAGE);
  }
}

export async function listStyleGuides(this: StyleAgentApiContext): Promise<StyleGuide[]> {
  const styleGuides = await getJson<StyleGuide[] | null>(this, STYLE_GUIDES_PATH);
  if (!Array.isArray(styleGuides)) return [];
  return styleGuides.filter((styleGuide) => styleGuide.enabled);
}
