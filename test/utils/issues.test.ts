import { describe, it, expect } from 'vitest';
import { CategorizedIssues, categorizeIssues } from '../../nodes/Markupai/utils/issues';
import { Issue, IssueCategory } from '../../nodes/Markupai/Markupai.api.types';

function validateEmptyIssues(result: CategorizedIssues) {
	expect(result.clarity).toHaveLength(0);
	expect(result.consistency).toHaveLength(0);
	expect(result.terminology).toHaveLength(0);
	expect(result.tone).toHaveLength(0);
}

const mockIssues: Issue[] = [
	{
		original: 'text',
		position: {
			start_index: 0,
		},
		subcategory: 'Capitalization',
		category: IssueCategory.Grammar,
		suggestion: 'Text',
	},
	{
		original: 'word',
		position: {
			start_index: 5,
		},
		subcategory: 'Simpler Words',
		category: IssueCategory.Clarity,
		suggestion: 'term',
	},
	{
		original: 'sentence',
		position: {
			start_index: 10,
		},
		subcategory: 'Brand Voice',
		category: IssueCategory.Consistency,
		suggestion: 'phrase',
	},
	{
		original: 'tone',
		position: {
			start_index: 20,
		},
		subcategory: 'Transitions and Flow',
		category: IssueCategory.Tone,
		suggestion: 'style',
	},
];

describe('issues', () => {
	describe('categorizeIssues', () => {
		it('should categorize issues by category', () => {
			const result = categorizeIssues(mockIssues);

			expect(result.grammar).toHaveLength(1);
			expect(result.grammar[0].original).toBe('text');
			expect(result.clarity).toHaveLength(1);
			expect(result.clarity[0].original).toBe('word');
			expect(result.consistency).toHaveLength(1);
			expect(result.consistency[0].original).toBe('sentence');
			expect(result.tone).toHaveLength(1);
			expect(result.tone[0].original).toBe('tone');
		});

		it('should handle empty issues array', () => {
			const result = categorizeIssues([]);

			expect(result.grammar).toHaveLength(0);
			validateEmptyIssues(result);
		});

		it('should handle multiple issues in the same category', () => {
			const mockIssues: Issue[] = [
				{
					original: 'first grammar issue',
					position: {
						start_index: 0,
					},
					subcategory: 'Capitalization',
					category: IssueCategory.Grammar,
					suggestion: 'First grammar issue suggestion',
				},
				{
					original: 'second grammar issue',
					position: {
						start_index: 30,
					},
					subcategory: 'Capitalization',
					category: IssueCategory.Grammar,
					suggestion: 'Second grammar issue suggestion',
				},
			];

			const result = categorizeIssues(mockIssues);

			expect(result.grammar).toHaveLength(2);
			expect(result.grammar[0].original).toBe('first grammar issue');
			expect(result.grammar[1].original).toBe('second grammar issue');
		});

		it('should handle issues with unknown categories', () => {
			const mockIssues: Issue[] = [
				{
					original: 'unknown issue',
					position: {
						start_index: 1,
					},
					subcategory: 'unknown',
					category: 'unknown_category',
					suggestion: 'unknown suggestion',
				},
				{
					original: 'grammar issue',
					position: {
						start_index: 10,
					},
					subcategory: 'spelling',
					category: IssueCategory.Grammar,
					suggestion: 'grammar suggestion',
				},
			];

			const result = categorizeIssues(mockIssues);

			expect(result.grammar).toHaveLength(1);
			expect(result.grammar[0].original).toBe('grammar issue');
			validateEmptyIssues(result);
		});
	});
});
