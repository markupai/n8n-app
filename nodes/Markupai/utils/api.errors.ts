import { NodeApiError } from "n8n-workflow";
import type { INode, JsonObject } from "n8n-workflow";

interface HttpLikeResponse {
  statusCode: number;
  body: unknown;
}

function toErrorResponse(body: unknown): JsonObject {
  if (typeof body === "object" && body !== null) {
    return body as JsonObject;
  }
  return { message: typeof body === "string" ? body : String(body) };
}

function describeBody(body: unknown): string | undefined {
  if (body === null) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

/**
 * Build a NodeApiError from a non-2xx HTTP response so the n8n UI shows the
 * HTTP status, request URL, and response body. Use at any throw site that
 * would otherwise raise a bare `Error` for an upstream API failure.
 */
export function buildNodeApiError(
  node: INode,
  response: HttpLikeResponse,
  request: { method: string; url: string },
): NodeApiError {
  return new NodeApiError(node, toErrorResponse(response.body), {
    httpCode: String(response.statusCode),
    message: `${request.method} ${request.url} failed with status ${String(response.statusCode)}`,
    description: describeBody(response.body),
  });
}
