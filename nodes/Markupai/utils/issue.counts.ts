import type { IssueCounts } from "../Markupai.api.types";

function normalizeSeverity(severity: unknown): "high" | "medium" | "low" | null {
  if (typeof severity !== "string") return null;
  const value = severity.trim().toLowerCase();
  if (value === "high" || value === "medium" || value === "low") return value;
  return null;
}

export function getIssueCountsFromResult(
  result: Record<string, unknown> | null | undefined,
): IssueCounts {
  const counts: IssueCounts = {
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const issues = Array.isArray(result?.issues) ? result.issues : [];
  for (const item of issues) {
    const issue = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    if (!issue) continue;

    const severity = normalizeSeverity(issue.severity);
    if (!severity) continue;
    counts[severity] += 1;
  }

  counts.total = counts.high + counts.medium + counts.low;
  return counts;
}
