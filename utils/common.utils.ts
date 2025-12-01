/**
 * Gets the base URL string for the Markup AI API.
 * Checks MARKUP_AI_BASE_URL environment variable first, otherwise defaults to production URL.
 * @returns The base URL string
 */
export function getBaseUrlString(): string {
  // Check for custom base URL from environment variable (useful for dev)
  // If MARKUP_AI_BASE_URL is set and not empty, use it; otherwise use production URL
  const customBaseUrl = process.env.MARKUP_AI_BASE_URL;

  if (customBaseUrl && customBaseUrl.trim() !== "") {
    return customBaseUrl;
  }

  // Default to production URL
  return "https://api.markup.ai/";
}
