import { describe, expect, it } from "vitest";
import { renderReport, type AgentResult } from "../../nodes/Markupai/utils/report_template";

describe("renderReport", () => {
  it("renders the new issue-level report against a realistic style_agent payload", () => {
    const data: AgentResult = {
      type: "agent_run",
      timestamp: "2026-05-18T11:18:57.439263Z",
      workflow_id: "agw_L2Jjla1S6MftldxZo2AeNuWq",
      agent_name: "style_agent",
      document_name: "Pricing page",
      document_ref: "cms-pricing-page-42",
      result: {
        issues: [
          {
            id: "iss_1",
            agent: "style_agent",
            confidence: 1,
            severity: "high",
            explanation:
              "Use a less colloquial word? Try to use words readers understand worldwide.",
            position: { start: 39, end: 44, text: "Gonna" },
            category: "Tone",
            suggestion: "Going to",
            guideline_name: "Use a less colloquial word?",
            context_surface: "Gonna change the game.",
            read_only: false,
          },
          {
            id: "iss_2",
            agent: "style_agent",
            confidence: 1,
            severity: "medium",
            explanation: "Flesch-Kincaid grade level: 2. Readability metric for content.",
            position: { start: 0, end: 3, text: "Our" },
            category: "Clarity",
            guideline_name: "Flesch-Kincaid grade level: 2",
            context_surface: "Our product is the best in the market.",
            read_only: false,
          },
        ],
      },
      success: true,
    };

    const html = renderReport(data, { showNumericScores: false });

    expect(html).toContain("Content Analysis Report");
    expect(html).toContain("Risk Assessment");
    expect(html).toContain("High Risk");
    expect(html).toContain("Severity breakdown");
    expect(html).toContain("Use a less colloquial word?");
    expect(html).toContain("Flesch-Kincaid grade level: 2");
    expect(html).toContain("Pricing page");
    // Document name renders as plain text; the reference renders in a separate
    // monospace row.
    expect(html).toContain("cms-pricing-page-42");
    expect(html).not.toContain('href="https://example.com/pricing"');
    // Non-numeric mode hides per-goal scores and analysis index rows.
    expect(html).not.toContain("Scores by goal");
    expect(html).not.toContain("Clarity index");
    // No leftover placeholders.
    expect(html).not.toMatch(/\{\{\w+\}\}/);
  });

  it("renders numeric scores and Scores by goal when showNumericScores=true", () => {
    const data: AgentResult = {
      type: "agent_run",
      timestamp: "2026-05-18T12:00:00.000Z",
      workflow_id: "agw_numeric_1",
      agent_name: "style_agent",
      result: {
        issues: [],
        quality: {
          score: 88,
          status: "green",
          scoresByGoal: [
            { id: "clarity", displayName: "Clarity", score: 90, count: 0 },
            { id: "tone", displayName: "Tone", score: 86, count: 0 },
          ],
        },
        analysis: {
          styleGuideDisplayName: "Main",
          contentProfileDisplayName: "Marketing",
          words: 100,
          sentences: 8,
          clarityIndex: 90,
          informalityIndex: 20,
          livelinessIndex: 75,
          fleschReadingEase: 72,
        },
      },
      success: true,
    };

    const html = renderReport(data, { showNumericScores: true });

    expect(html).toContain("Low Risk");
    expect(html).toContain(">88<");
    expect(html).toContain("Scores by goal");
    expect(html).toContain("Clarity index");
    expect(html).toContain("Flesch reading ease");
    // Style-guide display name renders under the new "Style Guide" row label.
    expect(html).toContain("Style Guide");
    expect(html).toContain("Main");
  });

  it("prefers styleGuideDisplayName over the deprecated targetDisplayName", () => {
    const data: AgentResult = {
      type: "agent_run",
      timestamp: "2026-05-18T12:00:00.000Z",
      workflow_id: "agw_sg_pref",
      agent_name: "style_agent",
      result: {
        issues: [],
        analysis: {
          styleGuideDisplayName: "New Style Guide",
          targetDisplayName: "Legacy Target",
        },
      },
      success: true,
    };

    const html = renderReport(data, { showNumericScores: true });

    expect(html).toContain("Style Guide");
    expect(html).toContain("New Style Guide");
    expect(html).not.toContain("Legacy Target");
  });

  it("falls back to the deprecated targetDisplayName when styleGuideDisplayName is absent", () => {
    const data: AgentResult = {
      type: "agent_run",
      timestamp: "2026-05-18T12:00:00.000Z",
      workflow_id: "agw_sg_fallback",
      agent_name: "style_agent",
      result: {
        issues: [],
        analysis: {
          targetDisplayName: "Legacy Target",
        },
      },
      success: true,
    };

    const html = renderReport(data, { showNumericScores: true });

    expect(html).toContain("Style Guide");
    expect(html).toContain("Legacy Target");
  });

  it("renders a sane report when the API payload is missing issues/quality/analysis", () => {
    const data = {
      type: "agent_run",
      timestamp: "2026-05-18T13:00:00.000Z",
      workflow_id: "agw_minimal",
      agent_name: "style_agent",
      result: {} as unknown as AgentResult["result"],
      success: true,
    } as AgentResult;

    const html = renderReport(data, { showNumericScores: true });

    // Doesn't throw; empty-state branch is taken.
    expect(html).toContain("Content Analysis Report");
    expect(html).toContain("No issues found");
    expect(html).not.toMatch(/\{\{\w+\}\}/);
  });

  it("renders without crashing when result is undefined entirely", () => {
    const data = {
      type: "agent_run",
      timestamp: "2026-05-18T13:00:00.000Z",
      workflow_id: "agw_no_result",
      agent_name: "style_agent",
      result: undefined as unknown as AgentResult["result"],
      success: false,
    } as AgentResult;

    const html = renderReport(data);

    expect(html).toContain("Content Analysis Report");
    expect(html).toContain("No issues found");
    expect(html).not.toMatch(/\{\{\w+\}\}/);
  });
});
