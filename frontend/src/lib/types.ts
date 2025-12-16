export type ProgressSummary = {
	filled: number;
	total: number;
	percent: number;
};

export type PuzzleSummary = {
	id: number;
	title?: string;
	givens: string;
	creatorSuggestedDifficulty: number;
	aggregatedDifficulty: number;
	published: boolean;
	likes: number;
	dislikes: number;
	completionCount: number;
	goodnessRank: number;
	createdAt: string;
	progress?: ProgressSummary;
	solved?: boolean;
};

export type PuzzleListResponse = {
	items: PuzzleSummary[];
	page: number;
	pageSize: number;
	total: number;
};

export type PuzzleDetail = {
	id: number;
	title?: string;
	givens: string;
	creatorSuggestedDifficulty: number;
	aggregatedDifficulty: number;
	published: boolean;
	likes: number;
	dislikes: number;
	completionCount: number;
	goodnessRank: number;
	createdAt: string;
};

export type User = {
	id: number;
	email: string;
	displayName?: string;
};

export type MeResponse = {
	user: User | null;
};

export type AuthResponse = {
	user: User;
};

export type StatsResponse = {
	solvedCount: number;
	createdCount: number;
	inProgressCount: number;
};

export type MyPuzzlesResponse = {
	items: PuzzleSummary[];
};

export type ProgressResponse = {
	values: string;
	cornerNotes: number[];
	centerNotes: number[];
	progress: ProgressSummary;
	updatedAt: string;
};

export type ValidateResponse = {
	valid: boolean;
	solvable: boolean;
	unique: boolean;
	solutionCount: number;
	errors?: string[];
	normalized?: string;
};
