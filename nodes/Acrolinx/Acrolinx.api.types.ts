export type StyleGuides = StyleGuide[];

export interface PostStyleRewriteResponse {
	status: string;
	workflow_id: string;
}

export interface Scores {
	quality: {
		score: number;
	};
	clarity: {
		score: number;
		word_count: number;
		sentence_count: number;
		average_sentence_length: number;
		flesch_reading_ease: number;
		vocabulary_complexity: number;
		flesch_kincaid_grade: number;
		lexical_diversity: number;
		sentence_complexity: number;
	};
	grammar: {
		score: number;
		issues: number;
	};
	style_guide: {
		score: number;
		issues: number;
	};
	tone: {
		score: number;
		informality: number;
		liveliness: number;
	};
	terminology: {
		score: number;
		issues: number;
	};
}

export interface Issue {
	category?: string;
	subcategory?: string;
	original: string;
	suggestion?: string;
	modified?: string;
	char_index: number;
}

export enum IssueCategory {
	Grammar = 'grammar',
	SimpleVocab = 'simple_vocab',
	SentenceStructure = 'sentence_structure',
	SentenceLength = 'sentence_length',
	Tone = 'tone',
	StyleGuide = 'style_guide',
	Terminology = 'terminology',
}

export interface GetStyleRewriteResponse {
	workflow_id: string;
	status: 'running' | 'completed' | 'failed';
	scores?: Scores;
	rewrite_scores?: Scores;
	issues?: Issue[];
	rewrite?: string;
	check_options: {
		style_guide: {
			style_guide_type: string;
			style_guide_id: string;
		};
		dialect: string;
		tone: string;
	};
}

export interface StyleGuide {
	id: string;
	name: string;
	created_at: string;
	created_by: string;
	status: string;
	updated_at: string;
	updated_by: string;
}
