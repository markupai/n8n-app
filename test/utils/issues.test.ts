import { describe, it, expect } from 'vitest';
import { categorizeIssues } from '../../nodes/Markupai/utils/issues';
import { Issue, IssueCategory } from '../../nodes/Markupai/Markupai.api.types';

describe('issues', () => {
	describe('categorizeIssues', () => {
		it('should categorize issues by category', () => {
			const mockIssues: Issue[] = [
				{
					original: 'text',
					char_index: 0,
					subcategory: 'spelling',
					category: IssueCategory.Grammar,
				},
				{
					original: 'word',
					char_index: 5,
					subcategory: 'complex',
					category: IssueCategory.SimpleVocab,
				},
				{
					original: 'sentence',
					char_index: 10,
					subcategory: 'long',
					category: IssueCategory.SentenceLength,
				},
				{
					original: 'tone',
					char_index: 15,
					subcategory: 'formal',
					category: IssueCategory.Tone,
				},
			];

			const result = categorizeIssues(mockIssues);

			expect(result.grammar).toHaveLength(1);
			expect(result.grammar[0].original).toBe('text');
			expect(result.simple_vocab).toHaveLength(1);
			expect(result.simple_vocab[0].original).toBe('word');
			expect(result.sentence_length).toHaveLength(1);
			expect(result.sentence_length[0].original).toBe('sentence');
			expect(result.tone).toHaveLength(1);
			expect(result.tone[0].original).toBe('tone');
		});

		it('should handle empty issues array', () => {
			const result = categorizeIssues([]);

			expect(result.grammar).toHaveLength(0);
			expect(result.simple_vocab).toHaveLength(0);
			expect(result.sentence_structure).toHaveLength(0);
			expect(result.sentence_length).toHaveLength(0);
			expect(result.tone).toHaveLength(0);
			expect(result.style_guide).toHaveLength(0);
			expect(result.terminology).toHaveLength(0);
		});

		it('should handle issues with all categories', () => {
			const mockIssues: Issue[] = [
				{
					original: 'grammar issue',
					char_index: 0,
					subcategory: 'spelling',
					category: IssueCategory.Grammar,
				},
				{
					original: 'vocab issue',
					char_index: 1,
					subcategory: 'complex',
					category: IssueCategory.SimpleVocab,
				},
				{
					original: 'structure issue',
					char_index: 2,
					subcategory: 'fragment',
					category: IssueCategory.SentenceStructure,
				},
				{
					original: 'length issue',
					char_index: 3,
					subcategory: 'long',
					category: IssueCategory.SentenceLength,
				},
				{
					original: 'tone issue',
					char_index: 4,
					subcategory: 'formal',
					category: IssueCategory.Tone,
				},
				{
					original: 'style issue',
					char_index: 5,
					subcategory: 'guideline',
					category: IssueCategory.StyleGuide,
				},
				{
					original: 'terminology issue',
					char_index: 6,
					subcategory: 'technical',
					category: IssueCategory.Terminology,
				},
			];

			const result = categorizeIssues(mockIssues);

			expect(result.grammar).toHaveLength(1);
			expect(result.simple_vocab).toHaveLength(1);
			expect(result.sentence_structure).toHaveLength(1);
			expect(result.sentence_length).toHaveLength(1);
			expect(result.tone).toHaveLength(1);
			expect(result.style_guide).toHaveLength(1);
			expect(result.terminology).toHaveLength(1);
		});

		it('should handle multiple issues in the same category', () => {
			const mockIssues: Issue[] = [
				{
					original: 'first grammar issue',
					char_index: 0,
					subcategory: 'spelling',
					category: IssueCategory.Grammar,
				},
				{
					original: 'second grammar issue',
					char_index: 1,
					subcategory: 'grammar',
					category: IssueCategory.Grammar,
				},
				{
					original: 'third grammar issue',
					char_index: 2,
					subcategory: 'punctuation',
					category: IssueCategory.Grammar,
				},
			];

			const result = categorizeIssues(mockIssues);

			expect(result.grammar).toHaveLength(3);
			expect(result.grammar[0].original).toBe('first grammar issue');
			expect(result.grammar[1].original).toBe('second grammar issue');
			expect(result.grammar[2].original).toBe('third grammar issue');
		});

		it('should handle issues with unknown categories', () => {
			const mockIssues: Issue[] = [
				{
					original: 'unknown issue',
					char_index: 0,
					subcategory: 'unknown',
					category: 'unknown_category' as any,
				},
				{
					original: 'grammar issue',
					char_index: 1,
					subcategory: 'spelling',
					category: IssueCategory.Grammar,
				},
			];

			const result = categorizeIssues(mockIssues);

			expect(result.grammar).toHaveLength(1);
			expect(result.grammar[0].original).toBe('grammar issue');
			expect(result.simple_vocab).toHaveLength(0);
			expect(result.sentence_structure).toHaveLength(0);
			expect(result.sentence_length).toHaveLength(0);
			expect(result.tone).toHaveLength(0);
			expect(result.style_guide).toHaveLength(0);
			expect(result.terminology).toHaveLength(0);
		});
	});
});
