export type TechniqueID =
	| 'naked_single'
	| 'hidden_single'
	| 'pointing_pair'
	| 'box_line_reduction';

export type CellChange = {
	index: number;
	value: number;
};

export type CandidateElimination = {
	index: number;
	digit: number;
};

export type TechniqueResult = {
	technique: TechniqueID;
	applied: boolean;
	solvedCells?: CellChange[];
	eliminatedCandidates?: CandidateElimination[];
	message: string;
	difficulty: number; // 1-5
	affectedCells?: number[]; // Indices of cells involved in the technique
};

export type SolveStep = TechniqueResult & {
	stepNumber: number;
	timestamp: number;
};

export type SolveLog = {
	steps: SolveStep[];
	totalSteps: number;
	solved: boolean;
	stuck: boolean;
};

export type Hint = {
	technique: TechniqueID;
	message: string;
	affectedCells: number[];
	solvedCells?: CellChange[];
	eliminatedCandidates?: CandidateElimination[];
	difficulty: number;
};

export type HintSequence = {
	hints: Hint[];
	targetCell?: CellChange; // The cell that will be solved after applying all hints
};

