import { describe, it, expect } from "vitest";
import { generateEmailHTMLReport } from "../../nodes/Markupai/utils/email.generator";
import { GetStyleRewriteResponse } from "../../nodes/Markupai/Markupai.api.types";

const mockResult = {
  workflow: {
    id: "test-workflow-id",
    status: "completed",
    api_version: "1.0.0",
    type: "rewrites",
  },
  original: {
    scores: {
      quality: {
        score: 85,
        grammar: {
          score: 90,
          issues: 2,
        },
        consistency: {
          score: 85,
          issues: 1,
        },
        terminology: {
          score: 92,
          issues: 0,
        },
      },
      analysis: {
        clarity: {
          score: 80,
          word_count: 150,
          sentence_count: 10,
          average_sentence_length: 15,
          flesch_reading_ease: 70,
          vocabulary_complexity: 0.6,
          sentence_complexity: 0.5,
        },
        tone: {
          score: 88,
          informality: 0.3,
          liveliness: 0.4,
          informality_alignment: 150,
          liveliness_alignment: 120,
        },
      },
    },
    issues: [],
  },
  rewrite: {
    text: "Rewritten content",
    scores: {
      quality: {
        score: 85,
        grammar: { score: 90, issues: 2 },
        consistency: { score: 85, issues: 1 },
        terminology: { score: 92, issues: 0 },
      },
      analysis: {
        clarity: {
          score: 80,
          word_count: 150,
          sentence_count: 10,
          average_sentence_length: 15,
          flesch_reading_ease: 70,
          vocabulary_complexity: 0.6,
          sentence_complexity: 0.5,
        },
        tone: {
          score: 88,
          informality: 0.3,
          liveliness: 0.4,
          informality_alignment: 150,
          liveliness_alignment: 120,
        },
      },
    },
  },
  config: {
    style_guide: {
      style_guide_type: "Standard",
      style_guide_id: "sg-123",
    },
    dialect: "US English",
    tone: "Professional",
  },
} satisfies GetStyleRewriteResponse;

function validateCommonFields(result: string) {
  expect(result).toContain("<!DOCTYPE html>");
  expect(result).toContain("<title>MarkupAI Document Analysis Report</title>");
  expect(result).toContain("85");
  expect(result).toContain("Quality Score");
  expect(result).toContain("Standard");
  expect(result).toContain("US English");
  expect(result).toContain("Professional");
  expect(result).toContain("test-workflow-id");
}

describe("email.generator", () => {
  describe("generateEmailHTMLReport", () => {
    it("should generate HTML report with basic data", () => {
      const mockInputData = {
        document_name: "Test Document",
        document_owner: "John Doe",
        document_link: "https://example.com/doc",
      };

      const result = generateEmailHTMLReport(mockResult, mockInputData);

      validateCommonFields(result);
      expect(result).toContain("Test Document");
      expect(result).toContain("John Doe");
      expect(result).toContain("https://example.com/doc");
    });

    it("should handle all missing/undefined/empty optional data", () => {
      // Create a result with everything optional missing or empty
      const minimalResult: GetStyleRewriteResponse = {
        workflow: {
          id: "",
          status: "completed",
          api_version: "1.0.0",
          type: "rewrites",
        },
        original: undefined,
        config: undefined,
      };

      const result = generateEmailHTMLReport(minimalResult, {});

      // Should contain basic HTML structure
      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<title>MarkupAI Document Analysis Report</title>");

      // Document info should show N/A
      expect(result).toContain("Title: <strong>N/A</strong>");
      expect(result).toContain("Owner: <strong>N/A</strong>");
      expect(result).not.toContain("Open document");

      // Scores should show N/A with gray background
      expect(result).toContain("Quality Score");
      expect(result).toContain(
        '<td align="center" style="font-size:28px; font-weight:600; color:#000;">N/A</td>',
      );
      expect(result).toContain("background-color:#888");

      // Document statistics should show N/A
      expect(result).toContain(
        '<strong>N/A</strong></span><br><span style="font-size:14px;">Words Analyzed</span>',
      );
      expect(result).toContain(
        '<strong>N/A</strong></span><br><span style="font-size:14px;">Total Sentences</span>',
      );
      expect(result).toContain(
        '<strong>N/A</strong></span><br><span style="font-size:14px;">Average Sentence Length</span>',
      );

      // Issues should show 0
      expect(result).toContain("Total issues found: <strong>0</strong>");

      // Config fields should show N/A
      expect(result).toContain("Style Guide: <strong>N/A</strong>");
      expect(result).toContain("Dialect: <strong>N/A</strong>");
      expect(result).toContain("Tone: <strong>N/A</strong>");

      // Workflow ID should show N/A
      expect(result).toContain("Workflow ID: <strong>N/A</strong>");
    });

    it("should handle different score ranges for color coding", () => {
      const lowScoreResult: GetStyleRewriteResponse = {
        ...mockResult,
        original: {
          ...mockResult.original,
          scores: {
            ...mockResult.original.scores,
            quality: {
              ...mockResult.original.scores.quality,
              score: 45, // Low score (< 60)
            },
          },
        },
      };

      const result = generateEmailHTMLReport(lowScoreResult, {
        document_name: "Test",
      });

      expect(result).toContain("background-color:#fcd9e4"); // Red for low score
      expect(result).toContain("45");
    });

    it("should handle medium score range (60-79)", () => {
      const mediumScoreResult: GetStyleRewriteResponse = {
        ...mockResult,
        original: {
          ...mockResult.original,
          scores: {
            ...mockResult.original.scores,
            quality: {
              ...mockResult.original.scores.quality,
              score: 70, // Medium score (60-79)
            },
          },
        },
      };

      const result = generateEmailHTMLReport(mediumScoreResult, {
        document_name: "Test",
      });

      expect(result).toContain("background-color:#fff7c5"); // Yellow for medium score
      expect(result).toContain("70");
    });

    it("should handle high score range (>= 80)", () => {
      const highScoreResult: GetStyleRewriteResponse = {
        ...mockResult,
        original: {
          ...mockResult.original,
          scores: {
            ...mockResult.original.scores,
            quality: {
              ...mockResult.original.scores.quality,
              score: 95, // High score (>= 80)
            },
          },
        },
      };

      const result = generateEmailHTMLReport(highScoreResult, {
        document_name: "Test",
      });

      expect(result).toContain("background-color:#caffc9"); // Green for high score
      expect(result).toContain("95");
    });

    it("should handle all score color ranges in detail section", () => {
      const mixedScoresResult: GetStyleRewriteResponse = {
        ...mockResult,
        original: {
          ...mockResult.original,
          scores: {
            quality: {
              score: 85,
              grammar: { score: 45, issues: 0 }, // Low
              consistency: { score: 70, issues: 0 }, // Medium
              terminology: { score: 95, issues: 0 }, // High
            },
            analysis: {
              clarity: {
                score: 60, // Medium
                word_count: 150,
                sentence_count: 10,
                average_sentence_length: 15,
                flesch_reading_ease: 0,
                vocabulary_complexity: 0,
                sentence_complexity: 0,
              },
              tone: {
                score: 85,
                informality: 0,
                liveliness: 0,
                informality_alignment: 0,
                liveliness_alignment: 0,
              },
            },
          },
        },
      };

      const result = generateEmailHTMLReport(mixedScoresResult, {
        document_name: "Test",
      });

      // Check for all color ranges
      expect(result).toContain("#fcd9e4"); // Low score color
      expect(result).toContain("#fff7c5"); // Medium score color
      expect(result).toContain("#caffc9"); // High score color
    });

    it("should handle boundary score values", () => {
      const boundaryScoresResult: GetStyleRewriteResponse = {
        ...mockResult,
        original: {
          ...mockResult.original,
          scores: {
            quality: {
              score: 60, // Exactly at boundary
              grammar: { score: 59, issues: 0 }, // Just below boundary
              consistency: { score: 80, issues: 0 }, // Exactly at boundary
              terminology: { score: 79, issues: 0 }, // Just below boundary
            },
            analysis: {
              clarity: {
                score: 0, // Minimum score
                word_count: 0,
                sentence_count: 0,
                average_sentence_length: 0,
                flesch_reading_ease: 0,
                vocabulary_complexity: 0,
                sentence_complexity: 0,
              },
              tone: {
                score: 88,
                informality: 0,
                liveliness: 0,
                informality_alignment: 0,
                liveliness_alignment: 0,
              },
            },
          },
        },
      };

      const result = generateEmailHTMLReport(boundaryScoresResult, {
        document_name: "Test",
      });

      expect(result).toContain("60");
      expect(result).toContain("59");
      expect(result).toContain("80");
      expect(result).toContain("79");
      expect(result).toContain("0");
    });

    it("should properly escape HTML special characters", () => {
      const mockInputData = {
        document_name: "Test & <Report> \"Special\" 'Chars'",
        document_owner: "John & Jane",
        document_link: "https://example.com/test?param=value&other=test",
      };

      const result = generateEmailHTMLReport(mockResult, mockInputData);

      // HTML special characters should be escaped
      expect(result).toContain("Test &amp; &lt;Report&gt; &quot;Special&quot; &#039;Chars&#039;");
      expect(result).toContain("John &amp; Jane");
      expect(result).toContain("https://example.com/test?param=value&amp;other=test");
    });

    it("should display all document statistics correctly", () => {
      const result = generateEmailHTMLReport(mockResult, {
        document_name: "Test",
      });

      expect(result).toContain("150"); // word_count
      expect(result).toContain("10"); // sentence_count
      expect(result).toContain("15"); // average_sentence_length
      expect(result).toContain("Words Analyzed");
      expect(result).toContain("Total Sentences");
      expect(result).toContain("Average Sentence Length");
    });
  });
});
