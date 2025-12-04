import type {
  IExecuteFunctions,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
} from "n8n-workflow";
import { LoggerProxy } from "n8n-workflow";
import { StyleGuides } from "../Markupai.api.types";
import { getBaseUrlString } from "../../../utils/common.utils";

type Constants = {
  dialects: string[];
  tones: string[];
};

const DEFAULT_CONSTANTS = {
  dialects: ["american_english", "british_english", "canadian_english"],
  tones: [
    "academic",
    "confident",
    "conversational",
    "empathetic",
    "engaging",
    "friendly",
    "professional",
    "technical",
  ],
};

const appendDefaultTone = (tones: string[]) => {
  return ["None", ...tones];
};

const mapTones = (tones: string[]) => {
  return appendDefaultTone(tones).map((tone) => ({
    name: tone,
    value: tone,
  }));
};

export function getBaseUrl(): URL {
  return new URL(getBaseUrlString());
}

export async function loadStyleGuides(
  this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
  try {
    const baseUrl = getBaseUrl();

    const httpRequestOptions: IHttpRequestOptions = {
      method: "GET",
      url: `${baseUrl.toString()}v1/style-guides`,
      returnFullResponse: true,
    };

    const response = (await this.helpers.httpRequestWithAuthentication.call(
      this,
      "markupaiApi",
      httpRequestOptions,
    )) as { statusCode: number; body: unknown };

    if (response.statusCode !== 200) {
      const bodyStr = typeof response.body === "string" ? response.body : String(response.body);
      throw new Error("Error loading style guides: " + bodyStr);
    }

    const styleGuides = response.body as StyleGuides;

    return styleGuides.map((styleGuide) => ({
      name: styleGuide.name,
      value: styleGuide.id,
    }));
  } catch (error) {
    throw new Error("Error loading style guides", error as Error);
  }
}

async function getConstants(this: ILoadOptionsFunctions | IExecuteFunctions): Promise<Constants> {
  const baseUrl = getBaseUrl();

  const requestOptions: IHttpRequestOptions = {
    method: "GET",
    url: `${baseUrl.toString()}v1/internal/constants`,
    returnFullResponse: true,
  };

  const response = (await this.helpers.httpRequestWithAuthentication.call(
    this,
    "markupaiApi",
    requestOptions,
  )) as { statusCode: number; body: unknown };

  if (response.statusCode !== 200) {
    const bodyStr =
      typeof response.body === "string" ? response.body : JSON.stringify(response.body);
    const parsed = JSON.parse(bodyStr) as { error?: string };
    throw new Error(parsed.error ?? "Unknown error");
  }

  return response.body as Constants;
}

export async function loadTones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  try {
    const constants = await getConstants.call(this);

    return mapTones(constants.tones);
  } catch (error) {
    LoggerProxy.error("Couldn't fetch tones from API, using default tones.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapTones(DEFAULT_CONSTANTS.tones);
  }
}

export async function loadDialects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  try {
    const constants = await getConstants.call(this);

    return constants.dialects.map((dialect: string) => ({
      name: dialect,
      value: dialect,
    }));
  } catch (error) {
    LoggerProxy.error("Couldn't fetch dialects from API, using default dialects.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_CONSTANTS.dialects.map((dialect: string) => ({
      name: dialect,
      value: dialect,
    }));
  }
}
