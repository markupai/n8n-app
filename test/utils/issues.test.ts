import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategorizedIssues, categorizeIssues } from "../../nodes/Markupai/utils/issues";
import { Issue, IssueCategory } from "../../nodes/Markupai/Markupai.api.types";
import { LoggerProxy } from "n8n-workflow";

function validateEmptyIssues(result: CategorizedIssues) {
  expect(result.clarity).toHaveLength(0);
  expect(result.consistency).toHaveLength(0);
  expect(result.terminology).toHaveLength(0);
  expect(result.tone).toHaveLength(0);
}

vi.mock("n8n-workflow", async () => {
  const actual = await vi.importActual("n8n-workflow");
  return {
    ...actual,
    LoggerProxy: {
      warn: vi.fn(),
    },
  };
});

describe("issues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LoggerProxy.warn).mockClear();
  });

  describe("categorizeIssues", () => {
    it("should categorize issues by category", () => {
      const mockIssues: Issue[] = [
        {
          original: "text",
          position: {
            start_index: 0,
          },
          subcategory: "Capitalization",
          category: IssueCategory.Grammar,
          suggestion: "Text",
        },
        {
          original: "word",
          position: {
            start_index: 5,
          },
          subcategory: "Simpler Words",
          category: IssueCategory.Clarity,
          suggestion: "term",
        },
        {
          original: "sentence",
          position: {
            start_index: 10,
          },
          subcategory: "Brand Voice",
          category: IssueCategory.Consistency,
          suggestion: "phrase",
        },
        {
          original: "tone",
          position: {
            start_index: 20,
          },
          subcategory: "Transitions and Flow",
          category: IssueCategory.Tone,
          suggestion: "style",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.grammar).toHaveLength(1);
      expect(result.grammar[0].original).toBe("text");
      expect(result.clarity).toHaveLength(1);
      expect(result.clarity[0].original).toBe("word");
      expect(result.consistency).toHaveLength(1);
      expect(result.consistency[0].original).toBe("sentence");
      expect(result.tone).toHaveLength(1);
      expect(result.tone[0].original).toBe("tone");
    });

    it("should handle empty issues array", () => {
      const result = categorizeIssues([]);

      expect(result.grammar).toHaveLength(0);
      validateEmptyIssues(result);
    });

    it("should handle multiple issues in the same category", () => {
      const mockIssues: Issue[] = [
        {
          original: "first grammar issue",
          position: {
            start_index: 0,
          },
          subcategory: "Capitalization",
          category: IssueCategory.Grammar,
          suggestion: "First grammar issue suggestion",
        },
        {
          original: "second grammar issue",
          position: {
            start_index: 30,
          },
          subcategory: "Capitalization",
          category: IssueCategory.Grammar,
          suggestion: "Second grammar issue suggestion",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.grammar).toHaveLength(2);
      expect(result.grammar[0].original).toBe("first grammar issue");
      expect(result.grammar[1].original).toBe("second grammar issue");
    });

    it("should handle issues with unknown categories", () => {
      const mockIssues: Issue[] = [
        {
          original: "unknown issue",
          position: {
            start_index: 1,
          },
          subcategory: "unknown",
          category: "unknown_category",
          suggestion: "unknown suggestion",
        },
        {
          original: "grammar issue",
          position: {
            start_index: 10,
          },
          subcategory: "spelling",
          category: IssueCategory.Grammar,
          suggestion: "grammar suggestion",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.grammar).toHaveLength(1);
      expect(result.grammar[0].original).toBe("grammar issue");
      validateEmptyIssues(result);
      expect(LoggerProxy.warn).toHaveBeenCalledWith("Unknown issue category: unknown_category");
    });

    it("should categorize Terminology issues correctly", () => {
      const mockIssues: Issue[] = [
        {
          original: "terminology issue",
          position: {
            start_index: 0,
          },
          subcategory: "Terminology",
          category: IssueCategory.Terminology,
          suggestion: "correct term",
        },
        {
          original: "another terminology issue",
          position: {
            start_index: 20,
          },
          subcategory: "Terminology",
          category: IssueCategory.Terminology,
          suggestion: "another correct term",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.terminology).toHaveLength(2);
      expect(result.terminology[0].original).toBe("terminology issue");
      expect(result.terminology[1].original).toBe("another terminology issue");
      expect(result.grammar).toHaveLength(0);
      expect(result.clarity).toHaveLength(0);
      expect(result.consistency).toHaveLength(0);
      expect(result.tone).toHaveLength(0);
    });

    it("should handle all categories in a single array", () => {
      const mockIssues: Issue[] = [
        {
          original: "grammar",
          position: { start_index: 0 },
          subcategory: "spelling",
          category: IssueCategory.Grammar,
          suggestion: "grammar fix",
        },
        {
          original: "clarity",
          position: { start_index: 10 },
          subcategory: "simpler",
          category: IssueCategory.Clarity,
          suggestion: "clarity fix",
        },
        {
          original: "consistency",
          position: { start_index: 20 },
          subcategory: "brand",
          category: IssueCategory.Consistency,
          suggestion: "consistency fix",
        },
        {
          original: "terminology",
          position: { start_index: 30 },
          subcategory: "term",
          category: IssueCategory.Terminology,
          suggestion: "terminology fix",
        },
        {
          original: "tone",
          position: { start_index: 40 },
          subcategory: "voice",
          category: IssueCategory.Tone,
          suggestion: "tone fix",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.grammar).toHaveLength(1);
      expect(result.clarity).toHaveLength(1);
      expect(result.consistency).toHaveLength(1);
      expect(result.terminology).toHaveLength(1);
      expect(result.tone).toHaveLength(1);

      expect(result.grammar[0].original).toBe("grammar");
      expect(result.clarity[0].original).toBe("clarity");
      expect(result.consistency[0].original).toBe("consistency");
      expect(result.terminology[0].original).toBe("terminology");
      expect(result.tone[0].original).toBe("tone");
    });

    it("should handle multiple issues across all categories", () => {
      const mockIssues: Issue[] = [
        // Grammar issues
        {
          original: "grammar1",
          position: { start_index: 0 },
          subcategory: "spelling",
          category: IssueCategory.Grammar,
          suggestion: "fix1",
        },
        {
          original: "grammar2",
          position: { start_index: 10 },
          subcategory: "capitalization",
          category: IssueCategory.Grammar,
          suggestion: "fix2",
        },
        // Clarity issues
        {
          original: "clarity1",
          position: { start_index: 20 },
          subcategory: "simpler",
          category: IssueCategory.Clarity,
          suggestion: "fix3",
        },
        {
          original: "clarity2",
          position: { start_index: 30 },
          subcategory: "complexity",
          category: IssueCategory.Clarity,
          suggestion: "fix4",
        },
        // Consistency issues
        {
          original: "consistency1",
          position: { start_index: 40 },
          subcategory: "brand",
          category: IssueCategory.Consistency,
          suggestion: "fix5",
        },
        // Terminology issues
        {
          original: "terminology1",
          position: { start_index: 50 },
          subcategory: "term",
          category: IssueCategory.Terminology,
          suggestion: "fix6",
        },
        {
          original: "terminology2",
          position: { start_index: 60 },
          subcategory: "term",
          category: IssueCategory.Terminology,
          suggestion: "fix7",
        },
        // Tone issues
        {
          original: "tone1",
          position: { start_index: 70 },
          subcategory: "voice",
          category: IssueCategory.Tone,
          suggestion: "fix8",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.grammar).toHaveLength(2);
      expect(result.clarity).toHaveLength(2);
      expect(result.consistency).toHaveLength(1);
      expect(result.terminology).toHaveLength(2);
      expect(result.tone).toHaveLength(1);
    });

    it("should preserve all issue properties when categorizing", () => {
      const mockIssues: Issue[] = [
        {
          original: "test issue",
          position: {
            start_index: 5,
          },
          subcategory: "test subcategory",
          category: IssueCategory.Grammar,
          suggestion: "test suggestion",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.grammar).toHaveLength(1);
      const categorizedIssue = result.grammar[0];
      expect(categorizedIssue.original).toBe("test issue");
      expect(categorizedIssue.position.start_index).toBe(5);
      expect(categorizedIssue.subcategory).toBe("test subcategory");
      expect(categorizedIssue.category).toBe(IssueCategory.Grammar);
      expect(categorizedIssue.suggestion).toBe("test suggestion");
    });

    it("should handle issues with only start_index in position", () => {
      const mockIssues: Issue[] = [
        {
          original: "issue without end_index",
          position: {
            start_index: 0,
          },
          subcategory: "test",
          category: IssueCategory.Clarity,
          suggestion: "fix",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.clarity).toHaveLength(1);
      expect(result.clarity[0].position.start_index).toBe(0);
    });

    it("should not call LoggerProxy.warn for known categories", () => {
      const mockIssues: Issue[] = [
        {
          original: "grammar",
          position: { start_index: 0 },
          subcategory: "test",
          category: IssueCategory.Grammar,
          suggestion: "fix",
        },
        {
          original: "clarity",
          position: { start_index: 10 },
          subcategory: "test",
          category: IssueCategory.Clarity,
          suggestion: "fix",
        },
        {
          original: "consistency",
          position: { start_index: 20 },
          subcategory: "test",
          category: IssueCategory.Consistency,
          suggestion: "fix",
        },
        {
          original: "terminology",
          position: { start_index: 30 },
          subcategory: "test",
          category: IssueCategory.Terminology,
          suggestion: "fix",
        },
        {
          original: "tone",
          position: { start_index: 40 },
          subcategory: "test",
          category: IssueCategory.Tone,
          suggestion: "fix",
        },
      ];

      categorizeIssues(mockIssues);

      expect(LoggerProxy.warn).not.toHaveBeenCalled();
    });

    it("should handle multiple unknown categories", () => {
      const mockIssues: Issue[] = [
        {
          original: "unknown1",
          position: { start_index: 0 },
          subcategory: "test",
          category: "unknown1",
          suggestion: "fix",
        },
        {
          original: "unknown2",
          position: { start_index: 10 },
          subcategory: "test",
          category: "unknown2",
          suggestion: "fix",
        },
        {
          original: "grammar",
          position: { start_index: 20 },
          subcategory: "test",
          category: IssueCategory.Grammar,
          suggestion: "fix",
        },
      ];

      const result = categorizeIssues(mockIssues);

      expect(result.grammar).toHaveLength(1);
      validateEmptyIssues(result);
      expect(LoggerProxy.warn).toHaveBeenCalledTimes(2);
      expect(LoggerProxy.warn).toHaveBeenCalledWith("Unknown issue category: unknown1");
      expect(LoggerProxy.warn).toHaveBeenCalledWith("Unknown issue category: unknown2");
    });
  });
});
