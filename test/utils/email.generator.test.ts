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
} as GetStyleRewriteResponse;

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

		it("should handle missing optional fields", () => {
			const mockInputData = {};
			const result = generateEmailHTMLReport(mockResult, mockInputData);

			validateCommonFields(result);

			expect(result).toContain("Title: <strong>undefined</strong>");
			expect(result).toContain("Owner: <strong>undefined</strong>");
			expect(result).toContain('href="undefined"');
		});

		it("should handle issues data correctly", () => {
			const mockInputData = {
				document_name: "Technical Report",
				document_owner: "Jane Smith",
				document_link: "https://example.com/tech-report",
			};

			const result = generateEmailHTMLReport(mockResult, mockInputData);

			validateCommonFields(result);
			expect(result).toContain("Jane Smith");
			expect(result).toContain("https://example.com/tech-report");
			expect(result).toContain("Total issues found: <strong>0</strong>");
		});

		it("should handle different score ranges for color coding", () => {
			const lowScoreResult = {
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
			const mediumScoreResult = {
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
			const highScoreResult = {
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

		it("should handle missing scores with default values", () => {
			const resultWithMissingScores = {
				...mockResult,
				original: {
					...mockResult.original,
					scores: {
						quality: {
							score: undefined,
							grammar: { score: undefined },
							consistency: { score: undefined },
							terminology: { score: undefined },
						},
						analysis: {
							clarity: {
								score: undefined,
								word_count: undefined,
								sentence_count: undefined,
								average_sentence_length: undefined,
							},
							tone: {
								score: undefined,
							},
						},
					},
				},
			};

			const result = generateEmailHTMLReport(resultWithMissingScores, {
				document_name: "Test",
			});

			// Should use default value 0 for missing scores
			expect(result).toContain("0");
			expect(result).toContain("Quality Score");
		});

		it("should handle missing original.issues array", () => {
			const resultWithoutIssues = {
				...mockResult,
				original: {
					...mockResult.original,
					issues: undefined,
				},
			};

			const result = generateEmailHTMLReport(resultWithoutIssues, {
				document_name: "Test",
			});

			expect(result).toContain("Total issues found: <strong>0</strong>");
			expect(result).toContain("<strong>0</strong>"); // All issue counts should be 0
		});

		it("should handle empty issues array", () => {
			const resultWithEmptyIssues = {
				...mockResult,
				original: {
					...mockResult.original,
					issues: [],
				},
			};

			const result = generateEmailHTMLReport(resultWithEmptyIssues, {
				document_name: "Test",
			});

			expect(result).toContain("Total issues found: <strong>0</strong>");
		});

		it("should handle missing config fields", () => {
			const resultWithoutConfig = {
				...mockResult,
				config: {
					style_guide: {
						style_guide_type: undefined,
						style_guide_id: undefined,
					},
					dialect: undefined,
					tone: undefined,
				},
			};

			const result = generateEmailHTMLReport(resultWithoutConfig, {
				document_name: "Test",
			});

			expect(result).toContain("Style Guide: <strong>undefined</strong>");
			expect(result).toContain("Dialect: <strong>undefined</strong>");
			expect(result).toContain("Tone: <strong>undefined</strong>");
		});

		it("should handle missing workflow id", () => {
			const resultWithoutWorkflowId = {
				...mockResult,
				workflow: {
					...mockResult.workflow,
					id: undefined,
				},
			};

			const result = generateEmailHTMLReport(resultWithoutWorkflowId, {
				document_name: "Test",
			});

			expect(result).toContain("Workflow ID: <strong></strong>");
		});

		it("should handle all score color ranges in detail section", () => {
			const mixedScoresResult = {
				...mockResult,
				original: {
					...mockResult.original,
					scores: {
						quality: {
							score: 85,
							grammar: { score: 45 }, // Low
							consistency: { score: 70 }, // Medium
							terminology: { score: 95 }, // High
						},
						analysis: {
							clarity: {
								score: 60, // Medium
								word_count: 150,
								sentence_count: 10,
								average_sentence_length: 15,
							},
							tone: {
								score: 85, // High
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
			const boundaryScoresResult = {
				...mockResult,
				original: {
					...mockResult.original,
					scores: {
						quality: {
							score: 60, // Exactly at boundary
							grammar: { score: 59 }, // Just below boundary
							consistency: { score: 80 }, // Exactly at boundary
							terminology: { score: 79 }, // Just below boundary
						},
						analysis: {
							clarity: {
								score: 0, // Minimum score
								word_count: 0,
								sentence_count: 0,
								average_sentence_length: 0,
							},
							tone: {
								score: 100, // Maximum score
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
			expect(result).toContain("100");
		});

		it("should handle special characters in document name", () => {
			const mockInputData = {
				document_name: "Test & <Report> \"Special\" 'Chars'",
				document_owner: "John & Jane",
				document_link: "https://example.com/test?param=value&other=test",
			};

			const result = generateEmailHTMLReport(mockResult, mockInputData);

			// HTML should be properly escaped or handled
			expect(result).toContain("Test & <Report>");
			expect(result).toContain("John & Jane");
			expect(result).toContain("https://example.com/test?param=value&other=test");
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
