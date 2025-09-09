export type StyleGuides = StyleGuide[];

export interface PostStyleRewriteResponse {
	status: string;
	workflow_id: string;
}

export interface Scores {
	quality: {
		score: number;
		grammar: {
			score: number;
			issues: number;
		};
		consistency: {
			score: number;
			issues: number;
		};
		terminology: {
			score: number;
			issues: number;
		};
	};
	analysis: {
		clarity: {
			score: number;
			word_count: number;
			sentence_count: number;
			average_sentence_length: number;
			flesch_reading_ease: number;
			vocabulary_complexity: number;
			sentence_complexity: number;
		};
		tone: {
			score: number;
			informality: number;
			liveliness: number;
			informality_alignment: number;
			liveliness_alignment: number;
		};
	};
}

export interface Issue {
	category: string;
	subcategory: string;
	original: string;
	suggestion: string;
	position: {
		start_index: number;
	};
}

export enum IssueCategory {
	Clarity = 'clarity',
	Consistency = 'consistency',
	Grammar = 'grammar',
	Terminology = 'terminology',
	Tone = 'tone',
}

export interface PostStyleRewriteResponse {
	status: string;
	workflow_id: string;
}

export interface GetStyleRewriteResponse {
	config?: {
		dialect: string;
		style_guide: {
			style_guide_type: string;
			style_guide_id: string;
		};
		tone: string;
	};
	original?: {
		issues: Issue[];
		scores: Scores;
	};
	rewrite?: {
		text: string;
		scores: Scores;
	};
	workflow: {
		id: string;
		api_version: string;
		generated_at?: string;
		status: 'running' | 'completed' | 'failed';
		type: string;
		webhook_response?: {
			url: string;
			status_code: number;
		};
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
