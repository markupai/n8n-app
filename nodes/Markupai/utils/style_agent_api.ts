import type { IExecuteFunctions, IHttpRequestOptions, ILoadOptionsFunctions } from "n8n-workflow";
import { getBaseUrl } from "./load.options";
import type { OrganizationConfigResponse, StyleAgentTarget } from "../Markupai.api.types";

const CONFIG_PATH = "style-agent/config";
const TARGETS_PATH = "style-agent/targets";

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

function stringifyResponseBody(body: unknown): string {
  if (typeof body === "string") return body;
  if (typeof body === "object" && body !== null) return JSON.stringify(body);
  return String(body);
}

function assertSuccessStatus(
  response: { statusCode: number; body: unknown },
  errorPrefix: string,
): void {
  if (response.statusCode === 200) return;
  throw new Error(`${errorPrefix}: ${stringifyResponseBody(response.body)}`);
}

async function getJson<T>(
  context: StyleAgentApiContext,
  path: string,
  errorPrefix: string,
): Promise<T> {
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
  assertSuccessStatus(response, errorPrefix);
  const bodyStr = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
  return JSON.parse(bodyStr) as T;
}

export async function getStyleAgentConfig(
  this: StyleAgentApiContext,
): Promise<OrganizationConfigResponse> {
  return getJson<OrganizationConfigResponse>(this, CONFIG_PATH, "Error loading style agent config");
}

export function assertStyleAgentEnabled(config: OrganizationConfigResponse): void {
  if (!ENABLED_STYLE_AGENT_MODES.has(config.style_agent)) {
    throw new Error(STYLE_AGENT_DISABLED_MESSAGE);
  }
}

export async function listStyleAgentTargets(
  this: StyleAgentApiContext,
): Promise<StyleAgentTarget[]> {
  const targets = await getJson<StyleAgentTarget[] | null>(
    this,
    TARGETS_PATH,
    "Error loading style agent targets",
  );
  if (!Array.isArray(targets)) return [];
  return targets.filter((target) => target.enabled);
}
