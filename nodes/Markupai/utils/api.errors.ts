import { NodeApiError } from "n8n-workflow";
import type { INode, JsonObject } from "n8n-workflow";

interface HttpLikeResponse {
  statusCode: number;
  body: unknown;
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
  const body = response.body;
  const errorResponse: JsonObject =
    typeof body === "object" && body !== null
      ? (body as JsonObject)
      : { message: typeof body === "string" ? body : String(body) };

  const description =
    typeof body === "string" ? body : body !== null ? JSON.stringify(body) : undefined;

  return new NodeApiError(node, errorResponse, {
    httpCode: String(response.statusCode),
    message: `${request.method} ${request.url} failed with status ${String(response.statusCode)}`,
    description,
  });
}
