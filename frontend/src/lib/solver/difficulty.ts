import type { SolveLog, SolveStep } from './types';
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

	// Count techniques by difficulty
	const difficultyCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	let maxDifficulty = 1;

	for (const step of log.steps) {
		const diff = step.difficulty;
		difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1;
		if (diff > maxDifficulty) {
			maxDifficulty = diff;
		}
	}

	// Base difficulty is the maximum technique difficulty used
	let calculatedDifficulty = maxDifficulty;

	// Apply frequency bonuses
	// If we have many difficulty-4 techniques, bump to 5
	if (maxDifficulty === 4 && difficultyCounts[4] >= 3) {
		calculatedDifficulty = 5;
	}

	// If we have many difficulty-3 techniques, bump to 4
	if (maxDifficulty === 3 && difficultyCounts[3] >= 5) {
		calculatedDifficulty = 4;
	}

	// If we have many difficulty-2 techniques, bump to 3
	if (maxDifficulty === 2 && difficultyCounts[2] >= 8) {
		calculatedDifficulty = 3;
	}

	// Ensure difficulty is between 1 and 5
	return Math.max(1, Math.min(5, calculatedDifficulty));
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
	const difficultyCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
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
		techniqueCounts,
		techniqueBreakdown,
	};
}

