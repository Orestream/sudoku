export type UInt = number;

export type PuzzleSummary = {
	id: UInt;
	title?: string;
	creatorSuggestedDifficulty: number;
	aggregatedDifficulty: number;
	likes: number;
	dislikes: number;
	completionCount: number;
	goodnessRank: number;
	createdAt: string;
};

export type PuzzleListResponse = {
	items: PuzzleSummary[];
	page: number;
	pageSize: number;
	total: number;
};

export type PuzzleDetail = {
	id: UInt;
	title?: string;
	givens: string;
	creatorSuggestedDifficulty: number;
	aggregatedDifficulty: number;
	likes: number;
	dislikes: number;
	completionCount: number;
	goodnessRank: number;
	createdAt: string;
};

export type ValidateResponse = {
	valid: boolean;
	solvable: boolean;
	unique: boolean;
	solutionCount: number;
	errors?: string[];
	normalized?: string;
};
