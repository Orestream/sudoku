import { TechniqueSolver } from './solver';
import {
	analyzePuzzleDifficulty,
	calculateDifficulty,
	calculateDifficultyFromCounts,
} from './difficulty';
import { generateSolvedGrid } from '../sudokuSolver';
import type { Grid } from '../sudoku';

type Evaluation = {
	difficulty: number;
	solved: boolean;
	stuck: boolean;
	maxDifficulty: number;
	steps: number;
	techniqueCounts: Record<number, number>; // counts per difficulty level
};

type Candidate = {
	puzzle: Grid;
	givens: number;
	eval?: Evaluation;
};

const DIFFICULTY_GIVENS_RANGE: Record<number, { min: number; max: number }> = {
	1: { min: 36, max: 45 },
	2: { min: 32, max: 40 },
	3: { min: 28, max: 36 },
	4: { min: 24, max: 32 },
	5: { min: 20, max: 28 },
	6: { min: 17, max: 26 },
	7: { min: 17, max: 24 },
	8: { min: 17, max: 23 },
	9: { min: 17, max: 22 },
	10: { min: 17, max: 21 },
};

const CACHE_LIMIT = 1200;
const ABSOLUTE_MIN_GIVENS = 17;

function getSearchParams(target: number): {
	beamWidth: number;
	movesPerNode: number;
	maxIterations: number;
} {
	if (target >= 5) {
		return { beamWidth: 8, movesPerNode: 12, maxIterations: 80 };
	}
	if (target === 4) {
		return { beamWidth: 7, movesPerNode: 10, maxIterations: 70 };
	}
	return { beamWidth: 6, movesPerNode: 8, maxIterations: 60 };
}

function getDifficultyRange(target: number): { min: number; max: number } {
	return DIFFICULTY_GIVENS_RANGE[target] ?? { min: 24, max: 32 };
}

function createDifficultyCounts(): Record<number, number> {
	return {
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
}

function puzzleKey(puzzle: Grid): string {
	return puzzle.join('');
}

function rememberCache(cache: Map<string, Evaluation>, key: string, value: Evaluation): void {
	cache.set(key, value);
	if (cache.size > CACHE_LIMIT) {
		const firstKey = cache.keys().next().value;
		if (firstKey) cache.delete(firstKey);
	}
}

function evaluateWithEarlyExit(
	puzzle: Grid,
	targetDifficulty: number,
	cache: Map<string, Evaluation>,
): Evaluation {
	const key = puzzleKey(puzzle);
	const cached = cache.get(key);
	if (cached) {
		return cached;
	}

	const difficultyCounts = createDifficultyCounts();
	const solver = new TechniqueSolver([...puzzle], puzzle);

	let maxDifficulty = 1;
	let steps = 0;

	while (!solver.grid.isSolved()) {
		const step = solver.solveStep();
		if (!step) {
			break;
		}

		steps++;

		const diff = step.difficulty;
		difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1;
		if (diff > maxDifficulty) {
			maxDifficulty = diff;
		}

		const projected = calculateDifficultyFromCounts(maxDifficulty, difficultyCounts);

		// If we already overshot the target, stop early to save compute.
		if (projected > targetDifficulty) {
			const evaluation: Evaluation = {
				difficulty: projected,
				solved: false,
				stuck: false,
				maxDifficulty,
				steps,
				techniqueCounts: { ...difficultyCounts },
			};
			rememberCache(cache, key, evaluation);
			return evaluation;
		}
	}

	const solved = solver.grid.isSolved();
	const stuck = !solved && !solver.canSolveStep();
	const difficulty = calculateDifficultyFromCounts(maxDifficulty, difficultyCounts);

	const evaluation: Evaluation = {
		difficulty,
		solved,
		stuck,
		maxDifficulty,
		steps,
		techniqueCounts: { ...difficultyCounts },
	};
	rememberCache(cache, key, evaluation);
	return evaluation;
}

/**
 * Calculate a technique richness score based on the distribution of techniques.
 * Higher scores mean more usage of harder techniques.
 *
 * For a target difficulty T, we want to maximize techniques at levels near T.
 */
function techniqueRichnessScore(
	techniqueCounts: Record<number, number>,
	targetDifficulty: number,
): number {
	let score = 0;

	// Define the threshold — we care about techniques within 3 levels of target
	const threshold = Math.max(1, targetDifficulty - 3);

	for (let level = threshold; level <= 10; level++) {
		const count = techniqueCounts[level] || 0;

		// Weight by proximity to target — techniques closer to target are worth more
		const weight = level >= targetDifficulty ? 3 : level === targetDifficulty - 1 ? 2 : 1;
		score += count * weight;
	}

	return score;
}

function candidateScore(
	evaluation: Evaluation,
	givens: number,
	targetDifficulty: number,
	range: { min: number; max: number },
): number {
	const center = Math.round((range.min + range.max) / 2);
	const distance = Math.abs(evaluation.difficulty - targetDifficulty);
	const givensPenalty = Math.abs(givens - center);

	let score = distance * 50 + givensPenalty;

	if (evaluation.stuck) {
		score += 2000;
	} else if (evaluation.difficulty > targetDifficulty) {
		score += 500;
	}

	if (evaluation.solved && evaluation.difficulty === targetDifficulty) {
		score -= 10000; // Always prefer an exact solved match.
		// For exact matches, prefer richer technique distribution
		const richness = techniqueRichnessScore(evaluation.techniqueCounts, targetDifficulty);
		score -= richness * 5; // Higher richness = lower (better) score
	} else if (evaluation.solved) {
		score -= 30;
		// Even for non-exact matches, slight preference for richer puzzles
		const richness = techniqueRichnessScore(evaluation.techniqueCounts, targetDifficulty);
		score -= richness * 2;
	}

	return score;
}

function betterCandidate(
	candidate: Candidate,
	best: Candidate,
	targetDifficulty: number,
	range: { min: number; max: number },
): boolean {
	const candidateEval = candidate.eval;
	const bestEval = best.eval;

	if (!candidateEval || !bestEval) {
		return false;
	}

	const candidateScoreValue = candidateScore(candidateEval, candidate.givens, targetDifficulty, range);
	const bestScoreValue = candidateScore(bestEval, best.givens, targetDifficulty, range);

	return candidateScoreValue < bestScoreValue;
}

function countGivens(puzzle: Grid): number {
	let count = 0;
	for (let i = 0; i < puzzle.length; i++) {
		if (puzzle[i] !== 0) {
			count++;
		}
	}
	return count;
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function seedPuzzleFromSolution(solution: Grid, range: { min: number; max: number }): Grid {
	const targetGivens = randomInt(range.min, range.max);
	const puzzle = [...solution];
	const indices = Array.from({ length: 81 }, (_, i) => i);
	shuffleArray(indices);

	let givens = 81;
	for (const idx of indices) {
		if (givens <= targetGivens) {
			break;
		}
		puzzle[idx] = 0;
		givens--;
	}

	return puzzle;
}

function sampleRemovalIndices(
	puzzle: Grid,
	sampleSize: number,
	minGivens: number,
): number[] {
	const filled: number[] = [];
	for (let i = 0; i < puzzle.length; i++) {
		if (puzzle[i] !== 0) {
			filled.push(i);
		}
	}

	if (filled.length <= minGivens) {
		return [];
	}

	shuffleArray(filled);

	const moves: number[] = [];
	let remainingGivens = filled.length;

	for (const idx of filled) {
		if (moves.length >= sampleSize) {
			break;
		}
		if (remainingGivens <= minGivens) {
			break;
		}
		moves.push(idx);
		remainingGivens--;
	}

	return moves;
}

function sampleAddBackIndices(puzzle: Grid, sampleSize: number): number[] {
	const empty: number[] = [];
	for (let i = 0; i < puzzle.length; i++) {
		if (puzzle[i] === 0) {
			empty.push(i);
		}
	}

	if (empty.length === 0) {
		return [];
	}

	shuffleArray(empty);
	return empty.slice(0, sampleSize);
}

function applyRemoval(puzzle: Grid, idx: number): Grid {
	if (puzzle[idx] === 0) {
		return puzzle;
	}
	const next = [...puzzle];
	next[idx] = 0;
	return next;
}

function applyAddBack(puzzle: Grid, solution: Grid, idx: number): Grid {
	const digit = solution[idx];
	if (digit === puzzle[idx]) {
		return puzzle;
	}
	const next = [...puzzle];
	next[idx] = digit;
	return next;
}

/**
 * Generate a puzzle with a target difficulty using a lightweight beam/local search.
 * The search can move in both directions (remove clues to make harder, add clues to recover).
 */
export async function generatePuzzle(targetDifficulty: number, signal?: AbortSignal): Promise<{
	puzzle: Grid;
	difficulty: number;
	steps: number;
}> {
	if (targetDifficulty < 1 || targetDifficulty > 10) {
		throw new Error('Target difficulty must be between 1 and 10');
	}

	const range = getDifficultyRange(targetDifficulty);
	const params = getSearchParams(targetDifficulty);
	const solution = generateSolvedGrid();
	const seedPuzzle = seedPuzzleFromSolution(solution, range);
	const cache = new Map<string, Evaluation>();

	const seedEvaluation = evaluateWithEarlyExit(seedPuzzle, targetDifficulty, cache);
	let best: Candidate = { puzzle: seedPuzzle, givens: countGivens(seedPuzzle), eval: seedEvaluation };
	let beam: Candidate[] = [best];

	let lastYieldTime = Date.now();

	for (let iteration = 0; iteration < params.maxIterations && beam.length > 0; iteration++) {
		const nextCandidates: Candidate[] = [];
		const seen = new Set<string>();

		// Yield if we've been blocking for too long (>20ms)
		if (Date.now() - lastYieldTime > 20) {
			await yieldToMain(signal);
			lastYieldTime = Date.now();
		}

		for (const candidate of beam) {
			// Yield if processing beam takes too long
			if (Date.now() - lastYieldTime > 20) {
				await yieldToMain(signal);
				lastYieldTime = Date.now();
			}

			const evaluation =
				candidate.eval ?? evaluateWithEarlyExit(candidate.puzzle, targetDifficulty, cache);
			candidate.eval = evaluation;

			if (evaluation.solved && evaluation.difficulty === targetDifficulty) {
				return { puzzle: candidate.puzzle, difficulty: evaluation.difficulty, steps: 81 - candidate.givens };
			}

			if (betterCandidate(candidate, best, targetDifficulty, range)) {
				best = candidate;
			}

			const minGivens = Math.max(range.min - 2, ABSOLUTE_MIN_GIVENS);
			const shouldAddBack = evaluation.stuck || evaluation.difficulty > targetDifficulty;

			const moveIndices = shouldAddBack
				? sampleAddBackIndices(candidate.puzzle, params.movesPerNode)
				: sampleRemovalIndices(candidate.puzzle, params.movesPerNode, minGivens);

			for (const idx of moveIndices) {
				// Yield inside the innermost loop where the heavy work (evaluation) happens
				if (Date.now() - lastYieldTime > 20) {
					await yieldToMain(signal);
					lastYieldTime = Date.now();
				}

				const nextPuzzle = shouldAddBack
					? applyAddBack(candidate.puzzle, solution, idx)
					: applyRemoval(candidate.puzzle, idx);

				if (nextPuzzle === candidate.puzzle) {
					continue;
				}

				const key = puzzleKey(nextPuzzle);
				if (seen.has(key)) {
					continue;
				}
				seen.add(key);

				const givens = shouldAddBack ? candidate.givens + 1 : candidate.givens - 1;
				const evalResult = evaluateWithEarlyExit(nextPuzzle, targetDifficulty, cache);
				const child: Candidate = { puzzle: nextPuzzle, givens, eval: evalResult };
				nextCandidates.push(child);

				if (evalResult.solved && evalResult.difficulty === targetDifficulty) {
					return { puzzle: nextPuzzle, difficulty: evalResult.difficulty, steps: 81 - givens };
				}
			}
		}

		if (nextCandidates.length === 0) {
			break;
		}

		nextCandidates.sort((a, b) => {
			const aEval = a.eval ?? evaluateWithEarlyExit(a.puzzle, targetDifficulty, cache);
			const bEval = b.eval ?? evaluateWithEarlyExit(b.puzzle, targetDifficulty, cache);

			return (
				candidateScore(aEval, a.givens, targetDifficulty, range) -
				candidateScore(bEval, b.givens, targetDifficulty, range)
			);
		});

		beam = nextCandidates.slice(0, params.beamWidth);

		const top = beam[0];
		if (top) {
			const topEval = top.eval ?? evaluateWithEarlyExit(top.puzzle, targetDifficulty, cache);
			const bestEval = best.eval ?? evaluateWithEarlyExit(best.puzzle, targetDifficulty, cache);
			if (
				candidateScore(topEval, top.givens, targetDifficulty, range) <
				candidateScore(bestEval, best.givens, targetDifficulty, range)
			) {
				best = { ...top, eval: topEval };
			}
		}
	}

	const bestEval = best.eval ?? evaluateWithEarlyExit(best.puzzle, targetDifficulty, cache);
	return { puzzle: best.puzzle, difficulty: bestEval.difficulty, steps: 81 - best.givens };
}

/**
 * Result from generatePuzzleExact
 */
export interface ExactGenerationResult {
	puzzle: Grid;
	difficulty: number;
	attempts: number;
	exactMatch: boolean;
}

/**
 * Options for generatePuzzleExact
 */
export interface ExactGenerationOptions {
	/** Maximum number of generation attempts (default: 50) */
	maxAttempts?: number;
	/** If true, return the closest difficulty found after max attempts (default: false) */
	allowRelaxed?: boolean;
	/** Callback for progress updates */
	onProgress?: (attempt: number, maxAttempts: number) => void;
	/** Signal to abort the generation process */
	signal?: AbortSignal;
}

/**
 * Helper to yield control to the browser for UI updates.
 */
function yieldToMain(signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.reject(new Error('Operation cancelled'));
	}
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (signal?.aborted) {
				reject(new Error('Operation cancelled'));
			} else {
				resolve();
			}
		}, 0);
	});
}

/**
 * Generate a puzzle with an exact target difficulty.
 * This async function retries puzzle generation until the exact difficulty is achieved,
 * or until maxAttempts is reached. It yields to the browser between attempts to allow
 * UI updates.
 *
 * @param targetDifficulty - The exact difficulty level to achieve (1-8)
 * @param options - Generation options
 * @returns The generated puzzle with exact difficulty (or closest if allowRelaxed)
 * @throws Error if exact difficulty cannot be achieved and allowRelaxed is false
 */
export async function generatePuzzleExact(
	targetDifficulty: number,
	options?: ExactGenerationOptions,
): Promise<ExactGenerationResult> {
	const maxAttempts = options?.maxAttempts ?? 50;
	const allowRelaxed = options?.allowRelaxed ?? false;
	const onProgress = options?.onProgress;
	const signal = options?.signal;

	if (targetDifficulty < 1 || targetDifficulty > 10) {
		throw new Error('Target difficulty must be between 1 and 10');
	}

	// Track the closest puzzle to target difficulty
	let closestPuzzle: Grid | null = null;
	let closestDifficulty = 0;
	let closestDistance = Infinity;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		if (onProgress) {
			onProgress(attempt, maxAttempts);
		}
		await yieldToMain(signal);

		const result = await generatePuzzle(targetDifficulty, signal);

		if (result.difficulty === targetDifficulty) {
			return {
				puzzle: result.puzzle,
				difficulty: result.difficulty,
				attempts: attempt,
				exactMatch: true,
			};
		}

		const distance = Math.abs(result.difficulty - targetDifficulty);
		if (distance < closestDistance) {
			closestPuzzle = result.puzzle;
			closestDifficulty = result.difficulty;
			closestDistance = distance;
		}
	}

	if (allowRelaxed && closestPuzzle !== null) {
		return {
			puzzle: closestPuzzle,
			difficulty: closestDifficulty,
			attempts: maxAttempts,
			exactMatch: false,
		};
	}

	throw new Error(
		`Could not generate puzzle with exact difficulty ${targetDifficulty} after ${maxAttempts} attempts. ` +
		`Closest achieved: ${closestDifficulty}`,
	);
}

/**
 * Optimize an existing puzzle to match target difficulty.
 * Similar to generatePuzzle but starts from existing puzzle.
 */
export function optimizeDifficulty(
	currentPuzzle: Grid,
	targetDifficulty: number,
): {
	puzzle: Grid;
	difficulty: number;
	steps: number;
} {
	if (targetDifficulty < 1 || targetDifficulty > 10) {
		throw new Error('Target difficulty must be between 1 and 10');
	}

	const puzzle: Grid = [...currentPuzzle];
	const currentDifficulty = analyzePuzzleDifficulty(puzzle, puzzle);

	if (currentDifficulty === targetDifficulty) {
		return {
			puzzle,
			difficulty: currentDifficulty,
			steps: 0,
		};
	}

	let removed = 0;

	// If current difficulty is lower, we need to remove more digits
	if (currentDifficulty < targetDifficulty) {
		const indices = Array.from({ length: 81 }, (_, i) => i);
		shuffleArray(indices);

		for (const idx of indices) {
			if (puzzle[idx] === 0) {
				continue;
			}

			const backup = puzzle[idx];
			puzzle[idx] = 0;

			const solver = new TechniqueSolver(puzzle, puzzle);
			const log = solver.solveAll();

			if (!log.solved) {
				puzzle[idx] = backup;
				continue;
			}

			const difficulty = calculateDifficulty(log);
			if (difficulty === targetDifficulty) {
				removed++;
				break;
			} else if (difficulty < targetDifficulty) {
				removed++;
			} else {
				puzzle[idx] = backup;
			}
		}
	} else {
		return {
			puzzle,
			difficulty: currentDifficulty,
			steps: 0,
		};
	}

	const finalSolver = new TechniqueSolver(puzzle, puzzle);
	const finalLog = finalSolver.solveAll();
	const finalDifficulty = calculateDifficulty(finalLog);

	return {
		puzzle,
		difficulty: finalDifficulty,
		steps: removed,
	};
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm.
 */
function shuffleArray<T>(array: T[]): void {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]!];
	}
}
