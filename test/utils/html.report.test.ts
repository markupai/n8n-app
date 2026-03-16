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

      expect(html).toContain("Brand");
      expect(html).toContain("Fluff");
      expect(html).not.toContain("Claims");
      expect(html).not.toContain("AI Voice");
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

    it("shows low document state when no high/medium issues", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
      });

      expect(html).toContain("Document State");
      expect(html).toMatch(/>\s*Low\s*</);
      expect(html).toContain("#e7f5e8");
      expect(html).toContain("#2d6a30");
    });

    it("shows high document state when high issues exist", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [{ severity: "high", agent: "terminology" }],
        },
      });

      expect(html).toMatch(/>\s*High\s*</);
      expect(html).toContain("#fce8e7");
    });

    it("shows medium document state when medium exists and no high", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: {
          issues: [{ severity: "medium", agent: "terminology" }],
        },
      });

      expect(html).toMatch(/>\s*Medium\s*</);
      expect(html).toContain("#fef6e0");
    });

    it("returns valid HTML even with null result", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: null,
      });

      expect(html).toContain("Content Analysis Report");
      expect(html).toContain("Low");
    });

    it("uses precomputed issueCounts when provided", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1"],
        result: { issues: [] },
        issueCounts: {
          total: 7,
          high: 3,
          medium: 2,
          low: 2,
        },
      });

      expect(html).toMatch(/>\s*High\s*</);
      expect(html).toMatch(/>\s*3\s*</);
      expect(html).toMatch(/>\s*2\s*</);
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

    it("does not render category breakdown section", () => {
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

      expect(html).not.toContain("Category breakdown");
    });

    it("organizes agents into screenshot-style groups", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_1", "ag_2", "ag_3", "ag_4"],
        result: {
          issues: [
            { severity: "high", agent: "terminology" },
            { severity: "medium", agent: "generic_claims" },
            { severity: "low", agent: "ai_voice_detector" },
          ],
        },
      });

      expect(html).toContain("Brand");
      expect(html).toContain("Compliance");
      expect(html).toContain("Content Integrity");
      expect(html).not.toContain("Other Agents");
      expect(html).toContain("Claims");
      expect(html).toContain("AI Voice");
      expect(html).toContain("Fluff");
    });

    it("keeps style variants grouped under Brand", () => {
      const html = buildIssuesHtmlReport({
        allAgents: [
          ...allAgents,
          { id: "ag_5", name: "style_guide" },
          { id: "ag_6", name: "terminology_checker" },
        ],
        selectedAgentIds: ["ag_5", "ag_6"],
        result: {
          issues: [{ severity: "high", agent: "style_guide" }],
        },
      });

      expect(html).toContain("Brand");
      expect(html).toContain("Style Guide");
      expect(html).toContain("Terminology Checker");
      expect(html).not.toContain("Other Agents");
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

    it("maps focus_agent display name to Fluff", () => {
      const html = buildIssuesHtmlReport({
        allAgents,
        selectedAgentIds: ["ag_3"],
        result: {
          issues: [{ severity: "high", agent: "focus_agent", category: "Tone" }],
        },
      });

      expect(html).toContain("Fluff");
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
