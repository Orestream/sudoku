import { SolverGrid } from './grid';
import { allTechniques, applyTechnique } from './techniques';

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
		for (const technique of allTechniques) {
			if (technique(this.grid) !== null) {
				return true;
			}
		}
		return false;
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
		for (const technique of allTechniques) {
			const result = technique(this.grid);
			if (result) {
				return this.applyStep(result);
			}
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
		while (!this.grid.isSolved()) {
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
		for (const technique of allTechniques) {
			const result = technique(this.grid);
			if (result) {
				return this.resultToHint(result);
			}
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
			let foundTechnique = false;

			// Try techniques in order of difficulty
			for (const technique of allTechniques) {
				const result = technique(clone);
				if (result) {
					hints.push(this.resultToHint(result));
					applyTechnique(clone, result);
					foundTechnique = true;

					if (result.solvedCells && result.solvedCells.length > 0) {
						return hints; // Goal achieved
					}
					break; // Continue to next step
				}
			}

			if (!foundTechnique) {
				break; // Stuck
			}
			maxSteps--;
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
