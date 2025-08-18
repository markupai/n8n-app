import { describe, it, expect } from 'vitest';
import { generateEmailHTMLReport } from '../../nodes/Markupai/utils/email.generator';

const mockResult = {
	workflow_id: 'test-workflow-id',
	status: 'completed' as const,
	scores: {
		quality: {
			score: 85,
		},
		clarity: {
			score: 80,
			word_count: 150,
			sentence_count: 10,
			average_sentence_length: 15,
			flesch_reading_ease: 70,
			vocabulary_complexity: 0.6,
			flesch_kincaid_grade: 8,
			lexical_diversity: 0.7,
			sentence_complexity: 0.5,
		},
		grammar: {
			score: 90,
			issues: 2,
		},
		style_guide: {
			score: 85,
			issues: 1,
		},
		tone: {
			score: 88,
			informality: 0.3,
			liveliness: 0.4,
		},
		terminology: {
			score: 92,
			issues: 0,
		},
	},
	issues: [],
	check_options: {
		style_guide: {
			style_guide_type: 'Standard',
			style_guide_id: 'sg-123',
		},
		dialect: 'US English',
		tone: 'Professional',
	},
};

describe('email.generator', () => {
	describe('generateEmailHTMLReport', () => {
		it('should generate HTML report with basic data', () => {
			const mockInputData = {
				document_name: 'Test Document',
				document_owner: 'John Doe',
				document_link: 'https://example.com/doc',
			};

			const result = generateEmailHTMLReport(mockResult, mockInputData);

			expect(result).toContain('<!DOCTYPE html>');
			expect(result).toContain('<title>MarkupAI Document Analysis Report</title>');
			expect(result).toContain('Test Document');
			expect(result).toContain('John Doe');
			expect(result).toContain('https://example.com/doc');
			expect(result).toContain('85');
			expect(result).toContain('Quality Score');
			expect(result).toContain('Standard');
			expect(result).toContain('US English');
			expect(result).toContain('Professional');
			expect(result).toContain('test-workflow-id');
		});

		it('should handle missing optional fields', () => {
			const mockInputData = {};
			const result = generateEmailHTMLReport(mockResult, mockInputData);

			expect(result).toContain('<!DOCTYPE html>');
			expect(result).toContain('<title>MarkupAI Document Analysis Report</title>');
			expect(result).toContain('85');
			expect(result).toContain('Quality Score');
			expect(result).toContain('Standard');
			expect(result).toContain('US English');
			expect(result).toContain('Professional');
			expect(result).toContain('test-workflow-id');

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

			expect(result).toContain('<!DOCTYPE html>');
			expect(result).toContain('Technical Report');
			expect(result).toContain('Jane Smith');
			expect(result).toContain('https://example.com/tech-report');
			expect(result).toContain('85');
			expect(result).toContain('Quality Score');
			expect(result).toContain('Standard');
			expect(result).toContain('US English');
			expect(result).toContain('Professional');
			expect(result).toContain('test-workflow-id');
			expect(result).toContain('Total issues found: <strong>0</strong>');
		});
	});
});
