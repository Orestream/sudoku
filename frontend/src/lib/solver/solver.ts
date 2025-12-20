import { SolverGrid } from './grid';
import {
	findHiddenSingle,
	findNakedSingle,
	findPointingPair,
	findBoxLineReduction,
	findHiddenPair,
	findNakedPair,
	findHiddenTriple,
	findPointingTriple,
	findBoxLineReductionTriple,
	findNakedTriple,
	findHiddenQuad,
	findXWing,
	findNakedQuad,
	findSwordfish,
	findJellyfish,
	findXYWing,
	findWWing,
	findBUG,
	findTwoStringKite,
	findUniqueRectangleType1,
	applyTechnique,
} from './techniques';
import type { TechniqueResult, SolveStep, SolveLog, Hint } from './types';

/**
 * Main solver engine that applies techniques step-by-step.
 */
export class TechniqueSolver {
	grid: SolverGrid; // Made public for getHintSequence
	private steps: SolveStep[] = [];
	private stepNumber = 0;

	constructor(values: number[], givens?: number[]) {
		this.grid = new SolverGrid(values, givens);
	}

	/**
	 * Get the current grid state.
	 */
	getGrid(): SolverGrid {
		return this.grid;
	}

	/**
	 * Get all solve steps so far.
	 */
	getSteps(): SolveStep[] {
		return [...this.steps];
	}

	/**
	 * Get the solve log.
	 */
	getLog(): SolveLog {
		return {
			steps: this.steps,
			totalSteps: this.steps.length,
			solved: this.grid.isSolved(),
			stuck: !this.grid.isSolved() && this.steps.length > 0 && !this.canSolveStep(),
		};
	}

	/**
	 * Check if another step can be solved.
	 */
	canSolveStep(): boolean {
		return (
			findHiddenSingle(this.grid) !== null ||
			findNakedSingle(this.grid) !== null ||
			findPointingPair(this.grid) !== null ||
			findBoxLineReduction(this.grid) !== null ||
			findHiddenPair(this.grid) !== null ||
			findNakedPair(this.grid) !== null ||
			findHiddenTriple(this.grid) !== null ||
			findPointingTriple(this.grid) !== null ||
			findBoxLineReductionTriple(this.grid) !== null ||
			findNakedTriple(this.grid) !== null ||
			findHiddenQuad(this.grid) !== null ||
			findXWing(this.grid) !== null ||
			findNakedQuad(this.grid) !== null ||
			findSwordfish(this.grid) !== null ||
			findJellyfish(this.grid) !== null ||
			findXYWing(this.grid) !== null ||
			findWWing(this.grid) !== null ||
			findBUG(this.grid) !== null ||
			findTwoStringKite(this.grid) !== null ||
			findUniqueRectangleType1(this.grid) !== null
		);
	}

	/**
	 * Solve one step by applying the next available technique.
	 * Returns the step result, or null if no technique can be applied.
	 */
	solveStep(): TechniqueResult | null {
		if (this.grid.isSolved()) {
			return null;
		}

		// Try techniques in order of difficulty (easiest first)
		let result: TechniqueResult | null = null;

		// Difficulty 1: Beginner
		result = findHiddenSingle(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		// Difficulty 2: Easy
		result = findNakedSingle(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findPointingPair(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findBoxLineReduction(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		// Difficulty 3: Medium
		result = findHiddenPair(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		// Difficulty 4: Medium-Hard
		result = findNakedPair(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findHiddenTriple(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findPointingTriple(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findBoxLineReductionTriple(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		// Difficulty 5: Hard
		result = findNakedTriple(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findHiddenQuad(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		// Difficulty 6: Very Hard
		result = findXWing(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findNakedQuad(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		// Difficulty 8: Expert+
		result = findXYWing(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findWWing(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findBUG(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		// Difficulty 7: Expert
		result = findSwordfish(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findJellyfish(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		// Difficulty 9: Master-level pattern now available
		result = findTwoStringKite(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		result = findUniqueRectangleType1(this.grid);
		if (result) {
			return this.applyStep(result);
		}

		return null;
	}

	/**
	 * Apply a technique result and log it as a step.
	 */
	private applyStep(result: TechniqueResult): TechniqueResult {
		applyTechnique(this.grid, result);
		this.stepNumber++;

		const step: SolveStep = {
			...result,
			applied: true,
			stepNumber: this.stepNumber,
			timestamp: Date.now(),
		};

		this.steps.push(step);
		return step;
	}

	/**
	 * Solve all steps until stuck or complete.
	 */
	solveAll(): SolveLog {
		while (!this.grid.isSolved() && this.canSolveStep()) {
			const result = this.solveStep();
			if (!result) {
				break;
			}
		}

		return this.getLog();
	}

	/**
	 * Get the next hint without applying it.
	 */
	getNextHint(): Hint | null {
		if (this.grid.isSolved()) {
			return null;
		}

		// Try techniques in order of difficulty
		let result: TechniqueResult | null = null;

		// Difficulty 1: Beginner
		result = findHiddenSingle(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		// Difficulty 2: Easy
		result = findNakedSingle(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findPointingPair(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findBoxLineReduction(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		// Difficulty 3: Medium
		result = findHiddenPair(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		// Difficulty 4: Medium-Hard
		result = findNakedPair(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findHiddenTriple(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findPointingTriple(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findBoxLineReductionTriple(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		// Difficulty 5: Hard
		result = findNakedTriple(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findHiddenQuad(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		// Difficulty 6: Very Hard
		result = findXWing(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findNakedQuad(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		// Difficulty 8: Expert+
		result = findXYWing(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findWWing(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findBUG(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		// Difficulty 7: Expert
		result = findSwordfish(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findJellyfish(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		// Difficulty 9: Master-level pattern now available
		result = findTwoStringKite(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		result = findUniqueRectangleType1(this.grid);
		if (result) {
			return this.resultToHint(result);
		}

		return null;
	}

	/**
	 * Get all hints that lead to solving a digit (sequence of hints).
	 * This simulates solving until a digit is placed, returning all hints needed.
	 */
	getHintSequence(): Hint[] {
		if (this.grid.isSolved()) {
			return [];
		}

		const hints: Hint[] = [];
		const clone = this.grid.clone();

		// Try to solve until we place a digit or get stuck
		let maxSteps = 20; // Limit to avoid infinite loops
		while (maxSteps > 0 && !clone.isSolved()) {
			// Try techniques in order of difficulty
			let result: TechniqueResult | null = null;

			// Difficulty 1: Beginner
			result = findHiddenSingle(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// Difficulty 2: Easy
			result = findNakedSingle(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findPointingPair(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findBoxLineReduction(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// Difficulty 3: Medium
			result = findHiddenPair(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// Difficulty 4: Medium-Hard
			result = findNakedPair(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findHiddenTriple(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findPointingTriple(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findBoxLineReductionTriple(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// Difficulty 5: Hard
			result = findNakedTriple(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findHiddenQuad(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// Difficulty 6: Very Hard
			result = findXWing(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findNakedQuad(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// Difficulty 8: Expert+
			result = findXYWing(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findWWing(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findBUG(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// Difficulty 7: Expert
			result = findSwordfish(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findJellyfish(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// Difficulty 9: Master-level pattern now available
			result = findTwoStringKite(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			result = findUniqueRectangleType1(clone);
			if (result) {
				hints.push(this.resultToHint(result));
				applyTechnique(clone, result);
				if (result.solvedCells && result.solvedCells.length > 0) {
					break;
				}
				maxSteps--;
				continue;
			}

			// No more techniques available
			break;
		}

		return hints;
	}

	/**
	 * Convert a technique result to a hint.
	 */
	private resultToHint(result: TechniqueResult): Hint {
		return {
			technique: result.technique,
			message: result.message,
			affectedCells: result.affectedCells ?? [],
			solvedCells: result.solvedCells,
			eliminatedCandidates: result.eliminatedCandidates,
			difficulty: result.difficulty,
		};
	}

	/**
	 * Reset the solver to initial state.
	 */
	reset(): void {
		const givens = this.grid.getGivens();
		const initialValues = this.grid.getGivens();
		this.grid = new SolverGrid(initialValues, givens);
		this.steps = [];
		this.stepNumber = 0;
	}

	/**
	 * Create a solver from a grid string (81 characters).
	 */
	static fromString(givens: string, values?: string): TechniqueSolver {
		const parseGrid = (s: string): number[] => {
			const grid: number[] = [];
			for (let i = 0; i < 81; i++) {
				const ch = s[i];
				if (ch === '.' || ch === '0') {
					grid.push(0);
				} else if (ch >= '1' && ch <= '9') {
					grid.push(Number(ch));
				} else {
					throw new Error(`Invalid character at index ${i}`);
				}
			}
			return grid;
		};

		const givensGrid = parseGrid(givens);
		const valuesGrid = values ? parseGrid(values) : givensGrid;
		return new TechniqueSolver(valuesGrid, givensGrid);
	}
}
