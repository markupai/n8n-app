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
      document_url: "https://example.com/pricing",
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
    // The document name is rendered as a hyperlink when document_url is present.
    expect(html).toContain('href="https://example.com/pricing"');
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
          targetDisplayName: "Main",
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
  });
});
