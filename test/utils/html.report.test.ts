import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildIssuesHtmlReport, setTemplateOverride } from "../../nodes/Markupai/utils/html.report";
import type { AgentMetadata } from "../../nodes/Markupai/Markupai.api.types";

const allAgents: AgentMetadata[] = [
  { id: "ag_1", name: "terminology" },
  { id: "ag_2", name: "generic_claims" },
  { id: "ag_3", name: "focus_agent" },
  { id: "ag_4", name: "ai_voice_detector" },
  { id: "ag__48WjfPsyKCX", name: "content_analysis" },
  { id: "ag_cnct5nkhtfNk", name: "parallel_executor" },
];

describe("html.report", () => {
  beforeAll(() => {
    const templatePath = resolve(__dirname, "../../nodes/Markupai/utils/report.template.html");
    setTemplateOverride(readFileSync(templatePath, "utf-8"));
  });

  afterAll(() => {
    setTemplateOverride(null);
  });

  describe("buildIssuesHtmlReport", () => {
    it("renders only selected agents, excludes orchestrators and non-selected", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1", "ag_3"],
        result: { issues: [] },
      });

      expect(html).toContain("Terminology");
      expect(html).toContain("Focus Agent");
      expect(html).not.toContain("Generic Claims");
      expect(html).not.toContain("Ai Voice Detector");
      expect(html).not.toContain("Parallel Executor");
    });

    it("shows severity summary and agents sections", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1", "ag_2"],
        result: {
          issues: [
            { severity: "high", agent: "terminology", category: "Tone" },
            { severity: "high", agent: "terminology", category: "Tone" },
            { severity: "medium", agent: "terminology", category: "Clarity" },
            { severity: "low", agent: "generic_claims", category: "Spelling and grammar" },
          ],
        },
      });

      expect(html).toContain("Content Analysis Report");
      expect(html).toContain("Severity summary");
      expect(html).toContain("Agents");
    });

    it("renders severity cells with severity colors", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [
            { severity: "high", agent: "terminology", category: "Tone" },
            { severity: "medium", agent: "terminology", category: "Clarity" },
            { severity: "low", agent: "terminology", category: "Spelling and grammar" },
          ],
        },
      });

      expect(html).toContain("#ef4540");
      expect(html).toContain("#d4940a");
      expect(html).toContain("#cfd7d6");
    });

    it("shows document title when provided", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
        documentName: "My Document",
      });

      expect(html).toContain("My Document");
    });

    it("shows open document link when URL provided", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
        documentUrl: "https://example.com/doc",
      });

      expect(html).toContain("Open document");
      expect(html).toContain("https://example.com/doc");
    });

    it("shows Untitled when no document name", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
      });

      expect(html).toContain("Untitled");
    });

    it("shows green total when zero issues", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
      });

      expect(html).toContain("#e7f5e8");
      expect(html).toContain("#2d6a30");
    });

    it("shows red total when high issues exist", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [{ severity: "high", agent: "terminology" }],
        },
      });

      expect(html).toContain("#fce8e7");
    });

    it("returns valid HTML even with null result", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: null,
      });

      expect(html).toContain("Content Analysis Report");
      expect(html).toContain("0");
    });

    it("renders workflow summary with status and timing", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
        workflowId: "agw_test123",
        status: "completed",
        startedAt: "2026-03-10T11:02:06.832981Z",
        completedAt: "2026-03-10T11:02:34.187498Z",
      });

      expect(html).toContain("Workflow summary");
      expect(html).toContain("agw_test123");
      expect(html).toContain("completed");
      expect(html).toContain("27s");
    });

    it("renders status badge for failed workflows", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
        status: "failed",
      });

      expect(html).toContain("failed");
      expect(html).toContain("#ef4540");
    });

    it("shows dash for missing workflow timing", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
      });

      expect(html).toContain("Workflow summary");
      expect(html).toContain("—");
    });

    it("renders category breakdown with counts", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [
            { severity: "high", agent: "terminology", category: "Tone" },
            { severity: "high", agent: "terminology", category: "Tone" },
            { severity: "medium", agent: "terminology", category: "Clarity" },
            { severity: "low", agent: "terminology", category: "Spelling and grammar" },
          ],
        },
      });

      expect(html).toContain("Category breakdown");
      expect(html).toContain("Tone");
      expect(html).toContain("Clarity");
      expect(html).toContain("Spelling And Grammar");
    });

    it("shows no issues detected when category breakdown is empty", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
      });

      expect(html).toContain("No issues detected");
    });

    it("sorts categories by total count descending", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [
            { severity: "high", agent: "terminology", category: "Clarity" },
            { severity: "high", agent: "terminology", category: "Tone" },
            { severity: "medium", agent: "terminology", category: "Tone" },
            { severity: "low", agent: "terminology", category: "Tone" },
          ],
        },
      });

      const toneIdx = html.indexOf("Tone");
      const clarityIdx = html.indexOf("Clarity");
      expect(toneIdx).toBeLessThan(clarityIdx);
    });

    it("does not render individual issues, explanations, or suggestions", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [
            {
              severity: "high",
              agent: "terminology",
              category: "Tone",
              explanation: "Could you replace this overused phrase?",
              suggestion: "better wording",
              position: { start: 100, end: 110, sentence: "paradigm" },
            },
          ],
        },
      });

      expect(html).not.toContain("Could you replace this overused phrase?");
      expect(html).not.toContain("better wording");
      expect(html).not.toContain("paradigm");
    });

    it("maps issues using the agent field from the API response", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [
            { severity: "high", agent: "terminology", category: "Tone" },
            { severity: "medium", agent: "terminology", category: "Tone" },
          ],
        },
      });

      expect(html).toContain("2 issues");
    });

    it("renders severity counts in category breakdown cards", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [
            { severity: "high", agent: "terminology", category: "Tone" },
            { severity: "medium", agent: "terminology", category: "Tone" },
            { severity: "low", agent: "terminology", category: "Tone" },
          ],
        },
      });

      expect(html).toContain("3 issues");
      expect(html).toContain("Tone");
      expect(html).toContain("High");
      expect(html).toContain("Medium");
      expect(html).toContain("Low");
    });

    it("renders Markup AI footer", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
      });

      expect(html).toContain("markup-logo-horz-coral.png");
      expect(html).toContain("Markup AI");
    });

    it("capitalizes agent names with underscores replaced by spaces", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_3"],
        result: {
          issues: [{ severity: "high", agent: "focus_agent", category: "Tone" }],
        },
      });

      expect(html).toContain("Focus Agent");
      expect(html).not.toContain("focus_agent");
    });

    it("uses email-safe table layout", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
      });

      expect(html).toContain('role="presentation"');
      expect(html).not.toContain("display:grid");
      expect(html).not.toContain("display:flex");
    });
  });
});
