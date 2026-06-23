/**
 * Email-safe HTML template for the Markup AI Style Agent — Content Analysis
 * Report. Designed to be injected into a Zapier "Format → HTML" or "Email"
 * step.
 *
 * Constraints honoured:
 *   - Table-based layout, no flexbox / no CSS grid.
 *   - Inline styles for all visual rules. (The single <style> tag only loads
 *     the Roboto webfont; it is safe to drop in clients that strip <style>.)
 *   - No SVG, no JS, no <script>. Logo served as a PNG from a CDN.
 *   - Width capped at 680px; renders to ~600px in narrow email clients.
 *   - Markup AI brand palette only.
 *
 * Usage in Zapier (Code step):
 *   import { renderReport } from "./report_template";
 *   return { html: renderReport(inputData.scoreJson) };
 *
 * `inputData.scoreJson` is the raw payload emitted by the style_agent
 * workflow — i.e. the JSON object documented in score.json.
 */

// ---------------------------------------------------------------------------
// Types — mirror the score.json contract
// ---------------------------------------------------------------------------

export type Severity = "high" | "medium" | "low";
export type QualityStatus = "green" | "yellow" | "red";

export interface AgentIssue {
  id?: string;
  agent?: string;
  confidence?: number;
  severity: Severity;
  explanation: string;
  position?: { start: number; end: number; text: string };
  category: string;
  suggestion?: string | null;
  suggestions?: string[] | null;
  guideline_name?: string | null;
  context_surface?: string | null;
  read_only?: boolean | null;
}

export interface GoalScore {
  id: string;
  displayName: string;
  score: number;
  count: number;
}

export interface AgentResult {
  type: string;
  timestamp: string;
  workflow_id: string;
  agent_name: string;
  // Caller-supplied document metadata, surfaced in the Workflow table.
  document_name?: string | null;
  document_ref?: string | null;
  result: {
    issues: AgentIssue[];
    warnings?: unknown[];
    // `quality` and `analysis` are nullable in the Cortex agent schema;
    // for style_agent they're only populated when style_guide_id /
    // content_profile_id resolve a Language-Service style guide. Every field
    // inside `analysis` is independently nullable.
    quality?: {
      score?: number | null;
      status?: string | null;
      scoresByGoal?: GoalScore[] | null;
    } | null;
    analysis?: {
      // The API returns both the new style-guide fields and the legacy target
      // fields during the migration transition; the renderer prefers the
      // former and falls back to the latter (`targetId` / `targetDisplayName`
      // are deprecated and read only as a transition-period fallback).
      styleGuideId?: string | null;
      styleGuideDisplayName?: string | null;
      targetId?: string | null;
      targetDisplayName?: string | null;
      contentProfileId?: string | null;
      contentProfileDisplayName?: string | null;
      words?: number | null;
      sentences?: number | null;
      clarityIndex?: number | null;
      informalityIndex?: number | null;
      livelinessIndex?: number | null;
      fleschReadingEase?: number | null;
    } | null;
  };
  success: boolean;
}

// ---------------------------------------------------------------------------
// Render options
// ---------------------------------------------------------------------------

export interface RenderOptions {
  /**
   * When true: show the raw numeric score everywhere (overall 0–100, per-goal
   * 0–100, and the analysis indexes for clarity / Flesch / informality /
   * liveliness).
   *
   * When false (default): the overall block leads with a large "High / Medium
   * / Low Risk" label, per-goal cards show a status word (Good / Fair /
   * Needs work) instead of a number, and the index rows are omitted from
   * Document details.
   *
   * Flip this on for internal / engineering recipients who want the raw
   * numbers; keep it off for execs and reviewers who only care about risk.
   */
  showNumericScores?: boolean;
}

const DEFAULT_OPTS: Required<RenderOptions> = {
  showNumericScores: false,
};

// ---------------------------------------------------------------------------
// Markup AI brand palette
// ---------------------------------------------------------------------------

const C = {
  // Primary
  burgundy: "#5d1a2c",
  coral: "#ef4540",
  linen: "#f9f8f2",
  sage: "#d7dcdf",
  sageAlt: "#cfd7d6",
  ocean: "#333332",
  // Secondary (used sparingly for status)
  chili: "#a63d2c",
  saddle: "#8c634e",
  delft: "#203d76",
  sageDeep: "#3f6b53", // brand-adjacent positive accent
  // Tints derived from the brand reds/blues (email-safe flat fills)
  redTint: "#fceae6",
  amberTint: "#f6eee4",
  blueTint: "#e8eef6",
  greenTint: "#e8efe9",
  rowAlt: "#fbf8f1",
};

const CDN_LOGO = "https://cdn.markup.ai/markup-logo-horz-coral.png";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const esc = (s: string | number | boolean | null | undefined): string => {
  if (s === null || s === undefined) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const titleCase = (s: string): string =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const pluralIssues = (n: number): string => `${String(n)} ${n === 1 ? "issue" : "issues"}`;

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// ---------------------------------------------------------------------------
// Score → colour mapping (no green in the brand palette, so we lean on
// Burgundy / Saddle / Chili for the score number itself, and use a muted
// sage-green only for "low risk" and "no issues" success states.)
// ---------------------------------------------------------------------------

function scoreColor(n: number): string {
  if (n >= 80) return C.burgundy;
  if (n >= 60) return C.saddle;
  return C.chili;
}

function scoreBg(status: QualityStatus): string {
  if (status === "green") return C.greenTint;
  if (status === "yellow") return C.amberTint;
  return C.redTint;
}

function riskInfo(status: QualityStatus): { label: string; color: string; bg: string } {
  if (status === "green") return { label: "Low Risk", color: C.sageDeep, bg: C.greenTint };
  if (status === "yellow") return { label: "Medium Risk", color: C.saddle, bg: C.amberTint };
  return { label: "High Risk", color: C.chili, bg: C.redTint };
}

function goalStatusLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Good", color: C.sageDeep, bg: C.greenTint };
  if (score >= 60) return { label: "Fair", color: C.saddle, bg: C.amberTint };
  return { label: "Needs work", color: C.chili, bg: C.redTint };
}

function normalizeQualityStatus(raw: unknown): QualityStatus | null {
  if (raw === "green" || raw === "yellow" || raw === "red") return raw;
  return null;
}

function deriveStatusFromIssues(issues: AgentIssue[]): QualityStatus {
  if (issues.some((i) => i.severity === "high")) return "red";
  if (issues.some((i) => i.severity === "medium")) return "yellow";
  return "green";
}

function severityBadge(sev: Severity): string {
  const cfg = {
    high: { bg: C.redTint, fg: C.chili, label: "High" },
    medium: { bg: C.amberTint, fg: C.saddle, label: "Medium" },
    low: { bg: C.blueTint, fg: C.delft, label: "Low" },
  }[sev];
  return (
    `<span style="display:inline-block;background:${cfg.bg};color:${cfg.fg};` +
    `font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;` +
    `padding:3px 8px;border-radius:4px;white-space:nowrap;">${cfg.label}</span>`
  );
}

// ---------------------------------------------------------------------------
// Section renderers — each returns the inner HTML for one {{token}}
// ---------------------------------------------------------------------------

function renderOverallBlock(
  status: QualityStatus,
  score: number | null,
  totalIssues: number,
  opts: Required<RenderOptions>,
): string {
  const risk = riskInfo(status);
  const bg = scoreBg(status);

  // Always lead with the risk label. When numeric scoring is on AND we have
  // a real score from the API, append the 0–100 score underneath. Otherwise
  // fall back to the issue-count secondary line.
  const scoreLine =
    opts.showNumericScores && score !== null
      ? `<div style="padding-top:10px;font-size:22px;font-weight:700;color:${scoreColor(score)};line-height:1;">${String(score)}<span style="font-size:13px;color:${C.saddle};font-weight:600;">&nbsp;/&nbsp;100</span></div>`
      : `<div style="font-size:13px;font-weight:600;color:${C.ocean};padding-top:10px;">${pluralIssues(totalIssues)} detected</div>`;

  return (
    `<td valign="top" width="44%" style="width:44%;padding:16px 18px;background-color:${bg};border-radius:12px;">` +
    `<div style="font-size:11px;font-weight:700;color:${C.burgundy};text-transform:uppercase;letter-spacing:0.1em;">Risk Assessment</div>` +
    `<div style="font-size:30px;font-weight:700;color:${risk.color};line-height:1.1;padding-top:12px;letter-spacing:-0.3px;white-space:nowrap;">${risk.label}</div>` +
    scoreLine +
    `</td>`
  );
}

function renderDocumentSection(
  a: NonNullable<AgentResult["result"]["analysis"]> | null | undefined,
  opts: Required<RenderOptions>,
): string {
  if (!a) return "";
  const rows: [string, string][] = [];
  // Prefer the new style-guide field; fall back to the deprecated target field
  // while the API still returns both during the migration transition.
  const styleGuideDisplayName = a.styleGuideDisplayName ?? a.targetDisplayName;
  if (styleGuideDisplayName) rows.push(["Style Guide", esc(styleGuideDisplayName)]);
  if (a.contentProfileDisplayName) rows.push(["Content profile", esc(a.contentProfileDisplayName)]);
  if (typeof a.words === "number" && typeof a.sentences === "number") {
    rows.push([
      "Length",
      `${a.words.toLocaleString()} words &middot; ${String(a.sentences)} sentences`,
    ]);
  }
  if (opts.showNumericScores) {
    if (typeof a.clarityIndex === "number")
      rows.push(["Clarity index", `${a.clarityIndex.toFixed(0)} / 100`]);
    if (typeof a.fleschReadingEase === "number")
      rows.push(["Flesch reading ease", `${a.fleschReadingEase.toFixed(0)} / 100`]);
    if (typeof a.informalityIndex === "number")
      rows.push(["Informality", `${a.informalityIndex.toFixed(0)} / 100`]);
    if (typeof a.livelinessIndex === "number")
      rows.push(["Liveliness", `${a.livelinessIndex.toFixed(0)} / 100`]);
  }
  if (rows.length === 0) return "";
  const body = rows
    .map(([k, v], i) => {
      const top = i === 0 ? "none" : `1px solid ${C.sage}`;
      return (
        `<tr>` +
        `<td style="padding:10px 14px;font-size:11px;color:${C.saddle};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border-top:${top};width:180px;vertical-align:top;">${k}</td>` +
        `<td style="padding:10px 14px;font-size:13px;color:${C.ocean};font-weight:500;border-top:${top};">${v}</td>` +
        `</tr>`
      );
    })
    .join("");
  return (
    `<tr><td style="padding:24px 28px 4px 28px;">` +
    `<div style="font-size:11px;font-weight:700;color:${C.burgundy};text-transform:uppercase;letter-spacing:0.1em;padding-bottom:10px;">Document details</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.sage};border-radius:10px;overflow:hidden;">` +
    body +
    `</table>` +
    `</td></tr>`
  );
}

const EMPTY_GOAL_CELL = `<td width="50%" style="width:50%;"></td>`;
const GOAL_SPACER_CELL = `<td width="12" style="width:12px;font-size:0;line-height:0;">&nbsp;</td>`;
const GOAL_ROW_SPACER = `<tr><td colspan="3" style="font-size:0;line-height:0;height:10px;">&nbsp;</td></tr>`;

function renderGoalCard(g: GoalScore, opts: Required<RenderOptions>): string {
  const sc = scoreColor(g.score);
  const status = goalStatusLabel(g.score);
  const rightCell = opts.showNumericScores
    ? `<td valign="top" align="right" style="font-size:24px;font-weight:700;color:${sc};line-height:1;white-space:nowrap;">${String(g.score)}<span style="font-size:11px;color:${C.sageAlt};font-weight:500;">/100</span></td>`
    : `<td valign="top" align="right" style="white-space:nowrap;"><span style="display:inline-block;background:${status.bg};color:${status.color};font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 8px;border-radius:4px;">${status.label}</span></td>`;
  const countLine =
    g.count === 0
      ? `<span style="color:${C.sageDeep};">No issues</span>`
      : `<span style="color:${C.chili};">${pluralIssues(g.count)}</span>`;
  return (
    `<td valign="top" width="50%" style="width:50%;padding:0;">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.linen};border:1px solid ${C.sage};border-radius:10px;">` +
    `<tr><td style="padding:14px 16px;">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">` +
    `<tr>` +
    `<td valign="top" style="font-size:13px;font-weight:600;color:${C.ocean};line-height:1.3;">${esc(g.displayName)}</td>` +
    rightCell +
    `</tr>` +
    `<tr><td colspan="2" style="font-size:11px;font-weight:600;padding-top:8px;letter-spacing:0.02em;">${countLine}</td></tr>` +
    `</table>` +
    `</td></tr>` +
    `</table>` +
    `</td>`
  );
}

function renderGoalRows(goals: GoalScore[], opts: Required<RenderOptions>): string {
  // 2 columns, two cards per row, with an 8px spacer column between them.
  const cell = (g: GoalScore | undefined): string =>
    g ? renderGoalCard(g, opts) : EMPTY_GOAL_CELL;
  let html = "";
  for (let i = 0; i < goals.length; i += 2) {
    html += `<tr>${cell(goals[i])}${GOAL_SPACER_CELL}${cell(goals[i + 1])}</tr>`;
    if (i + 2 < goals.length) html += GOAL_ROW_SPACER;
  }
  return html;
}

function isKnownSeverity(s: unknown): s is Severity {
  return s === "high" || s === "medium" || s === "low";
}

function renderIssueGroups(issues: AgentIssue[]): string {
  // Group by category. Within a group, sort high → medium → low.
  const sevRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  const groups = new Map<string, AgentIssue[]>();
  for (const iss of issues) {
    if (!isKnownSeverity(iss.severity)) continue;
    let bucket = groups.get(iss.category);
    if (!bucket) {
      bucket = [];
      groups.set(iss.category, bucket);
    }
    bucket.push(iss);
  }
  const cats = [...groups.entries()].sort(([aCat, aList], [bCat, bList]) => {
    // sort categories by their worst-severity item, then alphabetically
    const wa = Math.min(...aList.map((i) => sevRank[i.severity]));
    const wb = Math.min(...bList.map((i) => sevRank[i.severity]));
    return wa - wb || aCat.localeCompare(bCat);
  });

  let html = "";
  cats.forEach(([cat, bucket], ci) => {
    const list = [...bucket].sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
    const topBorder = ci === 0 ? "none" : `1px solid ${C.sage}`;

    // Category header row
    html +=
      `<tr><td style="padding:10px 14px;background:${C.linen};border-top:${topBorder};border-bottom:1px solid ${C.sage};">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
      `<td style="font-size:11px;font-weight:700;color:${C.burgundy};text-transform:uppercase;letter-spacing:0.1em;">${esc(cat)}</td>` +
      `<td align="right" style="font-size:11px;color:${C.saddle};font-weight:600;">${String(list.length)} ${list.length === 1 ? "issue" : "issues"}</td>` +
      `</tr></table></td></tr>`;

    list.forEach((iss, ii) => {
      const isLast = ii === list.length - 1;
      const bb = isLast ? "none" : `1px solid ${C.sage}`;
      const firstSentence = iss.explanation.split(".")[0] ?? iss.explanation;
      const guidance = iss.guideline_name || `${firstSentence}.`.replace(/^\.+/, "");
      const contextText = iss.context_surface ?? iss.position?.text ?? "";
      const contextRow = contextText
        ? `<tr><td colspan="2" style="padding-top:10px;">` +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.rowAlt};border-left:3px solid ${C.coral};border-radius:0 4px 4px 0;"><tr><td style="padding:8px 12px;font-size:12px;color:${C.ocean};font-style:italic;line-height:1.5;">&ldquo;${esc(contextText)}&rdquo;</td></tr></table>` +
          `</td></tr>`
        : "";
      const suggestionRow = iss.suggestion
        ? `<tr><td style="padding-top:8px;font-size:12px;color:${C.delft};line-height:1.45;">` +
          `<span style="color:${C.saddle};font-weight:700;">Suggested fix &rarr;</span> ` +
          `<strong style="color:${C.ocean};">${esc(iss.suggestion)}</strong></td></tr>`
        : "";

      html +=
        `<tr><td style="padding:14px 16px;border-bottom:${bb};">` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
        // Title + severity badge row
        `<tr>` +
        `<td valign="top" style="font-size:13px;font-weight:600;color:${C.ocean};padding-right:10px;line-height:1.35;">${esc(guidance)}</td>` +
        `<td valign="top" align="right" width="74" style="width:74px;">${severityBadge(iss.severity)}</td>` +
        `</tr>` +
        // Explanation
        `<tr><td colspan="2" style="padding-top:6px;font-size:12px;color:${C.saddle};line-height:1.5;">${esc(iss.explanation)}</td></tr>` +
        contextRow +
        suggestionRow +
        `</table>` +
        `</td></tr>`;
    });
  });
  return html;
}

function renderWorkflowRows(data: AgentResult): string {
  const statusBadge = data.success
    ? `<span style="display:inline-block;background:${C.greenTint};color:${C.sageDeep};font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;">&#9679; Completed</span>`
    : `<span style="display:inline-block;background:${C.redTint};color:${C.chili};font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;">&#9679; Failed</span>`;
  const rows: [string, string][] = [
    ["Status", statusBadge],
    ["Agent", esc(titleCase(data.agent_name))],
  ];

  const docName = data.document_name?.trim() ?? "";
  if (docName) {
    rows.push(["Document", esc(docName)]);
  }
  const docRef = data.document_ref?.trim() ?? "";
  if (docRef) {
    rows.push([
      "Reference",
      `<span style="font-family:Menlo,Consolas,monospace;font-size:11px;color:${C.saddle};word-break:break-all;">${esc(docRef)}</span>`,
    ]);
  }

  rows.push(
    [
      "Workflow ID",
      `<span style="font-family:Menlo,Consolas,monospace;font-size:11px;color:${C.saddle};word-break:break-all;">${esc(data.workflow_id)}</span>`,
    ],
    ["Generated", esc(fmtDate(data.timestamp))],
  );
  return rows
    .map(([k, v], i) => {
      const top = i === 0 ? "none" : `1px solid ${C.sage}`;
      return (
        `<tr>` +
        `<td style="padding:10px 14px;font-size:11px;color:${C.saddle};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border-top:${top};width:180px;vertical-align:top;">${k}</td>` +
        `<td style="padding:10px 14px;font-size:13px;color:${C.ocean};border-top:${top};">${v}</td>` +
        `</tr>`
      );
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export const REPORT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Content Analysis Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background-color:#f9f8f2;font-family:'Roboto',Helvetica,Arial,sans-serif;color:#333332;-webkit-font-smoothing:antialiased;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="background-color:#f9f8f2;">
<tr><td align="center" style="padding:28px 12px;">

<!-- ============================ CARD ============================ -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" style="width:680px;max-width:680px;background:#ffffff;border:1px solid #d7dcdf;border-radius:14px;overflow:hidden;">

  <!-- HEADER -->
  <tr><td style="background-color:#5d1a2c;padding:24px 28px 22px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle">
          <img src="${CDN_LOGO}" width="120" alt="Markup AI" style="display:block;border:0;outline:none;text-decoration:none;height:auto;">
        </td>
        <td valign="middle" align="right">
          <span style="display:inline-block;background-color:#ef4540;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:6px 12px;border-radius:100px;">{{agentLabel}}</span>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:18px;">
        <div style="font-size:24px;font-weight:700;color:#f9f8f2;line-height:1.2;letter-spacing:-0.2px;">Content Analysis Report</div>
        <div style="font-size:13px;color:#cfd7d6;padding-top:6px;">Generated {{generatedAt}}</div>
      </td></tr>
    </table>
  </td></tr>

  <!-- SCORE HERO -->
  <tr><td style="padding:24px 28px 4px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        {{overallBlock}}
        <td width="14" style="width:14px;font-size:0;line-height:0;">&nbsp;</td>
        <!-- Severity breakdown -->
        <td valign="top" style="padding:16px 18px;background:#ffffff;border:1px solid #d7dcdf;border-radius:12px;">
          <div style="font-size:11px;font-weight:700;color:#5d1a2c;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:10px;">Severity breakdown</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" style="font-size:22px;font-weight:700;color:#a63d2c;line-height:1;">{{highCount}}</td>
              <td align="center" style="font-size:22px;font-weight:700;color:#8c634e;line-height:1;">{{mediumCount}}</td>
              <td align="right" style="font-size:22px;font-weight:700;color:#203d76;line-height:1;">{{lowCount}}</td>
            </tr>
            <tr>
              <td align="left" style="font-size:10px;font-weight:700;color:#a63d2c;letter-spacing:0.08em;text-transform:uppercase;padding-top:6px;">High</td>
              <td align="center" style="font-size:10px;font-weight:700;color:#8c634e;letter-spacing:0.08em;text-transform:uppercase;padding-top:6px;">Medium</td>
              <td align="right" style="font-size:10px;font-weight:700;color:#203d76;letter-spacing:0.08em;text-transform:uppercase;padding-top:6px;">Low</td>
            </tr>
            <tr><td colspan="3" style="padding-top:12px;font-size:12px;color:#333332;">
              <span style="font-weight:700;color:#5d1a2c;">{{totalIssues}}</span> total issues detected
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- DOCUMENT DETAILS -->
  {{documentSection}}

  <!-- SCORES BY GOAL -->
  {{goalSection}}

  <!-- WORKFLOW -->
  <tr><td style="padding:24px 28px 4px 28px;">
    <div style="font-size:11px;font-weight:700;color:#5d1a2c;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:10px;">Workflow</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d7dcdf;border-radius:10px;overflow:hidden;">
      {{workflowRows}}
    </table>
  </td></tr>

  <!-- ISSUES FOUND -->
  <tr><td style="padding:24px 28px 28px 28px;">
    <div style="font-size:11px;font-weight:700;color:#5d1a2c;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:10px;">Issues found</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d7dcdf;border-radius:10px;overflow:hidden;">
      {{issueGroups}}
    </table>
  </td></tr>

</table>
<!-- ========================== /CARD ============================ -->

<!-- FOOTER -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" style="width:680px;max-width:680px;">
  <tr><td align="center" style="padding:22px 24px 8px;font-size:12px;color:#8c634e;line-height:1.6;">
    <div>This report was automatically generated by Markup AI.</div>
    <div style="padding-top:4px;color:#cfd7d6;">&copy; 2026 Markup AI &nbsp;&middot;&nbsp; Confidential</div>
  </td></tr>
</table>

</td></tr>
</table>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export function renderReport(data: AgentResult, options: RenderOptions = {}): string {
  const opts: Required<RenderOptions> = { ...DEFAULT_OPTS, ...options };
  // Guard against malformed payloads: API responses without an `issues`
  // array, or with `quality`/`analysis` missing, must still render rather
  // than crash the node. TS sees `data.result` as non-nullable, but at
  // runtime n8n hands us whatever the agent API returned.
  const result = (data as { result?: AgentResult["result"] }).result;
  const issues: AgentIssue[] = Array.isArray(result?.issues) ? result.issues : [];
  const high = issues.filter((i) => i.severity === "high").length;
  const medium = issues.filter((i) => i.severity === "medium").length;
  const low = issues.filter((i) => i.severity === "low").length;

  const quality = result?.quality ?? null;
  const status: QualityStatus =
    normalizeQualityStatus(quality?.status) ?? deriveStatusFromIssues(issues);
  const score = typeof quality?.score === "number" ? quality.score : null;
  const goals = Array.isArray(quality?.scoresByGoal) ? quality.scoresByGoal : null;

  const goalSection =
    opts.showNumericScores && goals && goals.length > 0
      ? `<tr><td style="padding:24px 28px 4px 28px;">` +
        `<div style="font-size:11px;font-weight:700;color:${C.burgundy};text-transform:uppercase;letter-spacing:0.1em;padding-bottom:12px;">Scores by goal</div>` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
        renderGoalRows(goals, opts) +
        `</table>` +
        `</td></tr>`
      : "";

  const subs: Record<string, string> = {
    agentLabel: esc(titleCase(data.agent_name)),
    generatedAt: esc(fmtDate(data.timestamp)),
    overallBlock: renderOverallBlock(status, score, issues.length, opts),
    highCount: String(high),
    mediumCount: String(medium),
    lowCount: String(low),
    totalIssues: String(issues.length),
    documentSection: renderDocumentSection(result?.analysis ?? null, opts),
    goalSection,
    issueGroups: issues.length
      ? renderIssueGroups(issues)
      : `<tr><td style="padding:18px;text-align:center;font-size:13px;color:${C.sageDeep};">No issues found. Great work!</td></tr>`,
    workflowRows: renderWorkflowRows(data),
  };

  return REPORT_TEMPLATE.replace(/{{(\w+)}}/g, (_m, k: string) => subs[k] ?? "");
}
