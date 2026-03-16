/**
 * Builds a statistics-focused HTML report: workflow metadata, severity summary,
 * and per-agent counts. No individual issues are rendered.
 *
 * The page layout lives in report.template.html (email-safe, table-based);
 * this module computes the data, renders the dynamic fragments, and injects
 * them into the template placeholders.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getIssueCountsFromResult } from "./issue.counts";
import type { AgentMetadata, IssueCounts } from "../Markupai.api.types";

// Markup AI brand palette
const BRAND = {
  coral: "#ef4540",
  linen: "#f9f8f2",
  burgundy: "#5d1a2c",
  sage: "#d7dcdf",
  sageAlt: "#cfd7d6",
  rock: "#333332",
} as const;

const SEVERITY_COLORS: Record<string, string> = {
  high: BRAND.coral,
  medium: "#d4940a",
  low: BRAND.sageAlt,
};

const SEVERITY_BG: Record<string, string> = {
  high: "#fce8e7",
  medium: "#fef6e0",
  low: BRAND.linen,
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: "#e7f5e8", text: "#2d6a30" },
  failed: { bg: "#fce8e7", text: BRAND.coral },
  timed_out: { bg: "#fef6e0", text: "#d4940a" },
  cancelled: { bg: BRAND.linen, text: BRAND.rock },
  running: { bg: "#e7eff8", text: "#2a5fa5" },
};

const ORCHESTRATOR_IDS = new Set(["ag__48WjfPsyKCX", "ag_cnct5nkhtfNk"]);
type DocumentState = "High" | "Medium" | "Low";
type AgentGroupKey = "ai_visibility" | "brand" | "compliance" | "content_integrity";

const AGENT_GROUPS: Array<{ key: AgentGroupKey; title: string; members: Set<string> }> = [
  {
    key: "ai_visibility",
    title: "AI Visibility",
    members: new Set(["freshness", "snippet_readiness", "source_authority"]),
  },
  {
    key: "brand",
    title: "Brand",
    members: new Set([
      "style",
      "style_agent",
      "style_guide",
      "writing_style",
      "brand_style",
      "terminology",
      "terminology_checker",
    ]),
  },
  {
    key: "compliance",
    title: "Compliance",
    members: new Set(["claims", "generic_claims"]),
  },
  {
    key: "content_integrity",
    title: "Content Integrity",
    members: new Set(["ai_voice", "ai_voice_detector", "focus_agent", "persona"]),
  },
];

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  ai_voice: "AI Voice",
  ai_voice_detector: "AI Voice",
  claims: "Claims",
  generic_claims: "Claims",
  snippet_readiness: "Snippet Readiness",
  source_authority: "Source Authority",
  style_agent: "Style",
  terminology: "Brand",
  focus_agent: "Fluff",
};

let cachedTemplate: string | null = null;

function loadTemplate(): string {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = readFileSync(resolve(__dirname, "report.template.html"), "utf-8");
  return cachedTemplate;
}

export function setTemplateOverride(html: string | null): void {
  cachedTemplate = html;
}

function getTemplate(): string {
  return cachedTemplate ?? loadTemplate();
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function normalizeSeverity(severity: unknown): "high" | "medium" | "low" | null {
  if (typeof severity !== "string") return null;
  const s = severity.trim().toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return null;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return escapeHtml(iso);
  }
}

function formatDuration(
  startedAt: string | undefined | null,
  completedAt: string | undefined | null,
): string {
  if (!startedAt || !completedAt) return "—";
  try {
    const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (ms < 0) return "—";
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${String(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes)}m ${String(remainingSeconds)}s`;
  } catch {
    return "—";
  }
}

function getDocumentState(highCount: number, mediumCount: number): DocumentState {
  if (highCount > 0) return "High";
  if (mediumCount > 0) return "Medium";
  return "Low";
}

function getDocumentStateBg(state: DocumentState): string {
  if (state === "High") return SEVERITY_BG.high;
  if (state === "Medium") return SEVERITY_BG.medium;
  return "#e7f5e8";
}

function getDocumentStateColor(state: DocumentState): string {
  if (state === "High") return BRAND.coral;
  if (state === "Medium") return SEVERITY_COLORS.medium;
  return "#2d6a30";
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IssueCountsBySeverity {
  high: number;
  medium: number;
  low: number;
}

export interface ReportInput {
  allAgents: AgentMetadata[];
  selectedAgentIds: string[];
  result: Record<string, unknown> | null | undefined;
  issueCounts?: IssueCounts;
  documentName?: string;
  documentUrl?: string;
  workflowId?: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function aggregateIssuesByAgent(issues: unknown[]): Map<string, IssueCountsBySeverity> {
  const byAgent = new Map<string, IssueCountsBySeverity>();

  for (const item of issues) {
    const issue = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    if (!issue) continue;

    const severity = normalizeSeverity(issue.severity);
    if (!severity) continue;

    const agent = typeof issue.agent === "string" ? issue.agent : "";
    const key = agent || "unknown";

    let counts = byAgent.get(key);
    if (!counts) {
      counts = { high: 0, medium: 0, low: 0 };
      byAgent.set(key, counts);
    }
    counts[severity] += 1;
  }

  return byAgent;
}

function formatKey(key: string): string {
  return key.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeAgentName(name: string): string {
  return name.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function getAgentDisplayName(name: string): string {
  const normalized = normalizeAgentName(name);
  return AGENT_DISPLAY_NAMES[normalized] ?? formatKey(name);
}

// ---------------------------------------------------------------------------
// Fragment renderers (email-safe table cells)
// ---------------------------------------------------------------------------

function renderSeverityCell(
  label: string,
  count: number,
  bgColor: string,
  textColor: string,
): string {
  return `<td style="background:${bgColor}; border-radius:8px; text-align:center; padding:12px; width:33.33%;">
    <div style="font-size:18px; font-weight:700; color:${textColor};">${String(count)}</div>
    <div style="font-size:14px;">${escapeHtml(label)}</div>
  </td>`;
}

function renderStatusBadge(status: string): string {
  const colors = STATUS_COLORS[status] ?? { bg: BRAND.linen, text: BRAND.rock };
  const label = status.replaceAll("_", " ");
  return `<span style="display:inline-block; padding:4px 12px; border-radius:12px; background:${colors.bg}; color:${colors.text}; font-size:12px; font-weight:600; text-transform:capitalize;">${escapeHtml(label)}</span>`;
}

function renderCardCell(
  title: string,
  highVal: string,
  medVal: string,
  lowVal: string,
  footerText: string,
  footerColor: string,
  opacity: string,
): string {
  return `<td style="width:33.33%; vertical-align:top; padding:4px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${BRAND.sage}; border-radius:10px; opacity:${opacity};">
      <tr>
        <td style="text-align:center; padding:14px 8px 8px; font-weight:600; font-size:14px; color:${BRAND.burgundy};">${escapeHtml(title)}</td>
      </tr>
      <tr>
        <td style="text-align:center; padding:0 8px 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center">
            <tr>
              <td style="text-align:center; padding:0 8px;">
                <div style="font-size:16px; font-weight:700; color:${SEVERITY_COLORS.high};">${highVal}</div>
                <div style="font-size:10px; color:${BRAND.sageAlt};">High</div>
              </td>
              <td style="text-align:center; padding:0 8px;">
                <div style="font-size:16px; font-weight:700; color:${SEVERITY_COLORS.medium};">${medVal}</div>
                <div style="font-size:10px; color:${BRAND.sageAlt};">Medium</div>
              </td>
              <td style="text-align:center; padding:0 8px;">
                <div style="font-size:16px; font-weight:700; color:${SEVERITY_COLORS.low};">${lowVal}</div>
                <div style="font-size:10px; color:${BRAND.sageAlt};">Low</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align:center; padding:4px 8px 12px; font-size:11px; font-weight:600; color:${footerColor};">${escapeHtml(footerText)}</td>
      </tr>
    </table>
  </td>`;
}

function buildCardGrid(cells: string[], columns: number): string {
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const rowCells = cells.slice(i, i + columns);
    while (rowCells.length < columns) {
      rowCells.push(`<td style="width:${String(Math.round(100 / columns))}%;"></td>`);
    }
    rows.push(`<tr>${rowCells.join("")}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`;
}

function renderAgentGroup(title: string, contentHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding-bottom:12px;">
    <tr>
      <td style="font-size:16px; font-weight:600; color:${BRAND.burgundy}; padding:4px 4px 8px;">${escapeHtml(title)}</td>
    </tr>
    <tr>
      <td>${contentHtml}</td>
    </tr>
  </table>`;
}

function renderAgentIssueCard(
  agent: AgentMetadata,
  issuesByAgent: Map<string, IssueCountsBySeverity>,
): string {
  const counts = issuesByAgent.get(agent.id) ?? issuesByAgent.get(agent.name) ?? null;
  const totalIssues = counts ? counts.high + counts.medium + counts.low : 0;
  const pluralS = totalIssues === 1 ? "" : "s";

  let footerColor: string = "#2d6a30";
  if (totalIssues > 0 && counts && counts.high > 0) footerColor = BRAND.coral;
  else if (totalIssues > 0) footerColor = SEVERITY_COLORS.medium;

  return renderCardCell(
    getAgentDisplayName(agent.name),
    String(counts?.high ?? 0),
    String(counts?.medium ?? 0),
    String(counts?.low ?? 0),
    `${String(totalIssues)} issue${pluralS}`,
    footerColor,
    "1",
  );
}

function getAgentGroupKey(agentName: string): AgentGroupKey | null {
  const normalized = normalizeAgentName(agentName);
  for (const group of AGENT_GROUPS) {
    if (group.members.has(normalized)) return group.key;
  }
  return null;
}

function buildAgentSections(
  cellsByGroup: Map<AgentGroupKey, string[]>,
  otherCells: string[],
): string[] {
  const groupedSections: string[] = [];
  for (const group of AGENT_GROUPS) {
    const cells = cellsByGroup.get(group.key) ?? [];
    if (cells.length > 0) {
      groupedSections.push(renderAgentGroup(group.title, buildCardGrid(cells, 3)));
    }
  }
  if (otherCells.length > 0) {
    groupedSections.push(renderAgentGroup("Other Agents", buildCardGrid(otherCells, 3)));
  }
  return groupedSections;
}

function renderAgentContent(
  displayAgents: AgentMetadata[],
  selectedSet: Set<string>,
  issuesByAgent: Map<string, IssueCountsBySeverity>,
): string {
  const selectedAgents = displayAgents.filter((a) => selectedSet.has(a.id));

  const cellsByGroup = new Map<AgentGroupKey, string[]>();
  for (const group of AGENT_GROUPS) {
    cellsByGroup.set(group.key, []);
  }
  const otherCells: string[] = [];

  for (const agent of selectedAgents) {
    const cell = renderAgentIssueCard(agent, issuesByAgent);
    const groupKey = getAgentGroupKey(agent.name);
    if (!groupKey) {
      otherCells.push(cell);
      continue;
    }
    const groupCells = cellsByGroup.get(groupKey);
    if (groupCells) groupCells.push(cell);
  }

  const groupedSections = buildAgentSections(cellsByGroup, otherCells);

  if (groupedSections.length === 0) {
    return `<div style="font-size:14px; color:${BRAND.sageAlt}; text-align:center; padding:16px 0;">No agents selected</div>`;
  }

  return groupedSections.join("");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function buildIssuesHtmlReport(input: ReportInput): string {
  const { allAgents, selectedAgentIds, result, documentName, documentUrl } = input;

  const issues = Array.isArray(result?.issues) ? (result.issues as unknown[]) : [];
  const issuesByAgent = aggregateIssuesByAgent(issues);
  const severityTotals = input.issueCounts ?? getIssueCountsFromResult(result);

  const selectedSet = new Set(selectedAgentIds);
  const displayAgents = allAgents.filter((a) => !ORCHESTRATOR_IDS.has(a.id));

  const totalHigh = severityTotals.high;
  const totalMedium = severityTotals.medium;
  const totalLow = severityTotals.low;
  const documentState = getDocumentState(totalHigh, totalMedium);

  const placeholders: Record<string, string> = {
    statusBadge: input.status ? renderStatusBadge(input.status) : "—",
    workflowId: escapeHtml(input.workflowId ?? "—"),
    startedAt: formatDateTime(input.startedAt),
    completedAt: formatDateTime(input.completedAt),
    duration: formatDuration(input.startedAt, input.completedAt),
    docTitle: documentName ? escapeHtml(documentName) : "Untitled",
    docLinkRow: documentUrl
      ? `<tr><td style="font-size:14px;"><a href="${escapeHtml(documentUrl)}" style="color:${BRAND.coral}; line-height:21px;">Open document</a></td></tr>`
      : "",
    totalIssueBg: getDocumentStateBg(documentState),
    totalIssueColor: getDocumentStateColor(documentState),
    documentState,
    severityCells: [
      renderSeverityCell("High", totalHigh, SEVERITY_BG.high, SEVERITY_COLORS.high),
      renderSeverityCell("Medium", totalMedium, SEVERITY_BG.medium, SEVERITY_COLORS.medium),
      renderSeverityCell("Low", totalLow, SEVERITY_BG.low, SEVERITY_COLORS.low),
    ].join(""),
    agentContent: renderAgentContent(displayAgents, selectedSet, issuesByAgent),
  };

  let html = getTemplate();
  for (const [key, value] of Object.entries(placeholders)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}
