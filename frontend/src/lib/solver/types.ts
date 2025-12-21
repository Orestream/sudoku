export type TechniqueID =
	// Beginner (Difficulty 1)
	| 'naked_single'
	| 'hidden_single'
	// Easy (Difficulty 2)
	| 'pointing_pair'
	| 'box_line_reduction'
	// Medium (Difficulty 3)
	| 'naked_pair'
	| 'hidden_pair'
	// Medium-Hard (Difficulty 4)
	| 'naked_triple'
	| 'hidden_triple'
	| 'pointing_triple'
	| 'box_line_reduction_triple'
	// Hard (Difficulty 5)
	| 'naked_quad'
	| 'hidden_quad'
	// Very Hard (Difficulty 6)
	| 'x_wing'
	// Expert (Difficulty 7)
	| 'swordfish'
	| 'jellyfish'
	// Expert+ (Difficulty 8)
	| 'xy_wing'
	| 'w_wing'
	// Master (Difficulty 9)
	| 'xyz_wing'
	| 'remote_pairs'
	| 'unique_rectangle_type1'
	| 'unique_rectangle_type2'
	| 'unique_rectangle_type3'
	| 'bug'
	| 'skyscraper'
	| 'two_string_kite'
	| 'turbot_fish'
	// Grandmaster (Difficulty 10)
	| 'wxyz_wing'
	| 'simple_coloring'
	| 'multi_coloring'
	| 'forcing_chain'
	| 'xy_chain'
	| 'x_cycle'
	| 'aic'
	| 'nice_loop'
	| 'grouped_nice_loop'
	| 'nishio'
	| 'bowmans_bingo'
	| 'death_blossom'
	| 'kraken_fish'
	| 'als'
	| 'als_xz'
	| 'als_xy_wing'
	| 'sue_de_coq'
	// Development only
	| 'bruteforce';

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
	difficulty: number; // 1-10
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
