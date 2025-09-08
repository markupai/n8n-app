import { describe, it, expect } from 'vitest';
import { generateEmailHTMLReport } from '../../nodes/Markupai/utils/email.generator';
import { GetStyleRewriteResponse } from '../../nodes/Markupai/Markupai.api.types';

const mockResult = {
	workflow: {
		id: 'test-workflow-id',
		status: 'completed',
		api_version: '1.0.0',
		type: 'rewrites',
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
					informality_alignment: 150.0,
					liveliness_alignment: 120.0,
				},
			},
		},
		issues: [],
	},
	rewrite: {
		text: 'Rewritten content',
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
					informality_alignment: 150.0,
					liveliness_alignment: 120.0,
				},
			},
		},
	},
	config: {
		style_guide: {
			style_guide_type: 'Standard',
			style_guide_id: 'sg-123',
		},
		dialect: 'US English',
		tone: 'Professional',
	},
} as GetStyleRewriteResponse;

function validateCommonFields(result: string) {
	expect(result).toContain('<!DOCTYPE html>');
	expect(result).toContain('<title>MarkupAI Document Analysis Report</title>');
	expect(result).toContain('85');
	expect(result).toContain('Quality Score');
	expect(result).toContain('Standard');
	expect(result).toContain('US English');
	expect(result).toContain('Professional');
	expect(result).toContain('test-workflow-id');
}

describe('email.generator', () => {
	describe('generateEmailHTMLReport', () => {
		it('should generate HTML report with basic data', () => {
			const mockInputData = {
				document_name: 'Test Document',
				document_owner: 'John Doe',
				document_link: 'https://example.com/doc',
			};

			const result = generateEmailHTMLReport(mockResult, mockInputData);

			validateCommonFields(result);
			expect(result).toContain('Test Document');
			expect(result).toContain('John Doe');
			expect(result).toContain('https://example.com/doc');
		});

		it('should handle missing optional fields', () => {
			const mockInputData = {};
			const result = generateEmailHTMLReport(mockResult, mockInputData);

			validateCommonFields(result);

			expect(result).toContain('Title: <strong>undefined</strong>');
			expect(result).toContain('Owner: <strong>undefined</strong>');
			expect(result).toContain('href="undefined"');
		});

		it('should handle issues data correctly', () => {
			const mockInputData = {
				document_name: 'Technical Report',
				document_owner: 'Jane Smith',
				document_link: 'https://example.com/tech-report',
			};

			const result = generateEmailHTMLReport(mockResult, mockInputData);

			validateCommonFields(result);
			expect(result).toContain('Jane Smith');
			expect(result).toContain('https://example.com/tech-report');
			expect(result).toContain('Total issues found: <strong>0</strong>');
		});
	});
});
