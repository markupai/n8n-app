import { NodeApiError } from "n8n-workflow";
import type { INodeExecutionData } from "n8n-workflow";

export function getErrorMessage(error: unknown): string {
  if (error instanceof NodeApiError) {
    return error.description || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof NodeApiError) {
    return error.description ?? undefined;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function createErrorResponse(error: unknown, itemIndex: number): INodeExecutionData {
  return {
    json: { error: getErrorMessage(error) },
    pairedItem: { item: itemIndex },
  };
}
