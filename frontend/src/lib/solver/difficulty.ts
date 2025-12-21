import type { SolveLog } from './types';
import { TechniqueSolver } from './solver';
import type { Grid } from '../sudoku';

/**
 * Calculate difficulty based on solve log.
 * Uses combination/frequency approach:
 * - Base difficulty = max technique difficulty used
 * - Bonus points for frequency of high-difficulty techniques
 * - Many difficulty-4 techniques can equal difficulty 5
 */
export function calculateDifficulty(log: SolveLog): number {
	if (log.steps.length === 0) {
		return 1; // Trivial puzzle
	}

	// Count techniques by difficulty (now 1-10)
	const difficultyCounts: Record<number, number> = {
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
		6: 0,
		7: 0,
		8: 0,
		9: 0,
		10: 0,
	};
	let maxDifficulty = 1;

	for (const step of log.steps) {
		const diff = step.difficulty;
		difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1;
		if (diff > maxDifficulty) {
			maxDifficulty = diff;
		}
	}

	return calculateDifficultyFromCounts(maxDifficulty, difficultyCounts);
}

/**
 * Calculate difficulty from pre-counted technique frequencies.
 * This mirrors the logic in calculateDifficulty but can be used incrementally.
 */
export function calculateDifficultyFromCounts(
	maxDifficulty: number,
	difficultyCounts: Record<number, number>,
): number {
	// Base difficulty is the maximum technique difficulty used
	let calculatedDifficulty = maxDifficulty;

	// Apply frequency bonuses for higher difficulties
	// Note: No bump from D9→D10 - Grandmaster requires actual D10 techniques

	if (maxDifficulty === 8 && difficultyCounts[8] >= 3) {
		calculatedDifficulty = 9;
	}

	if (maxDifficulty === 7 && difficultyCounts[7] >= 3) {
		calculatedDifficulty = 8;
	}

	if (maxDifficulty === 6 && difficultyCounts[6] >= 3) {
		calculatedDifficulty = 7;
	}

	if (maxDifficulty === 5 && difficultyCounts[5] >= 4) {
		calculatedDifficulty = 6;
	}

	if (maxDifficulty === 4 && difficultyCounts[4] >= 5) {
		calculatedDifficulty = 5;
	}

	if (maxDifficulty === 3 && difficultyCounts[3] >= 6) {
		calculatedDifficulty = 4;
	}

	if (maxDifficulty === 2 && difficultyCounts[2] >= 8) {
		calculatedDifficulty = 3;
	}

	return Math.max(1, Math.min(10, calculatedDifficulty));
}

/**
 * Analyze a puzzle and calculate its difficulty.
 */
export function analyzePuzzleDifficulty(givens: Grid, values?: Grid): number {
	const solver = new TechniqueSolver(values ?? givens, givens);
	const log = solver.solveAll();
	return calculateDifficulty(log);
}

/**
 * Analyze a puzzle from a givens string and calculate its difficulty.
 */
export function analyzePuzzleDifficultyFromString(givens: string, values?: string): number {
	const solver = TechniqueSolver.fromString(givens, values);
	const log = solver.solveAll();
	return calculateDifficulty(log);
}

/**
 * Get difficulty breakdown showing technique usage.
 */
export function getDifficultyBreakdown(log: SolveLog): {
	maxDifficulty: number;
	calculatedDifficulty: number;
	techniqueCounts: Record<number, number>;
	techniqueBreakdown: Record<string, number>;
} {
	const difficultyCounts: Record<number, number> = {
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
		6: 0,
		7: 0,
		8: 0,
		9: 0,
		10: 0,
	};
	const techniqueBreakdown: Record<string, number> = {};
	let maxDifficulty = 1;

	for (const step of log.steps) {
		const diff = step.difficulty;
		difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1;
		if (diff > maxDifficulty) {
			maxDifficulty = diff;
		}

		const tech = step.technique;
		techniqueBreakdown[tech] = (techniqueBreakdown[tech] || 0) + 1;
	}

	const calculatedDifficulty = calculateDifficulty(log);

	return {
		maxDifficulty,
		calculatedDifficulty,
		techniqueCounts: difficultyCounts,
		techniqueBreakdown,
	};
}
