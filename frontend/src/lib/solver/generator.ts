import { TechniqueSolver } from './solver';
import { analyzePuzzleDifficulty, calculateDifficulty } from './difficulty';
import { generateSolvedGrid } from '../sudokuSolver';
import type { Grid } from '../sudoku';

/**
 * Generate a puzzle with a target difficulty by removing digits from a solved grid.
 * Algorithm:
 * 1. Start with solved grid
 * 2. Randomly shuffle removal order
 * 3. For each cell:
 *    - Temporarily remove digit
 *    - Solve puzzle with technique solver
 *    - Check what technique is needed to solve that cell
 *    - If technique difficulty matches target, keep removal
 *    - If too easy, continue removing
 *    - If too hard, restore digit
 * 4. Continue until target difficulty achieved or no more removals possible
 */
export function generatePuzzle(targetDifficulty: number): {
	puzzle: Grid;
	difficulty: number;
	steps: number;
} {
	if (targetDifficulty < 1 || targetDifficulty > 5) {
		throw new Error('Target difficulty must be between 1 and 5');
	}

	// Start with a solved grid
	const solved = generateSolvedGrid();
	const puzzle: Grid = [...solved];

	// Create array of indices and shuffle
	const indices = Array.from({ length: 81 }, (_, i) => i);
	shuffleArray(indices);

	let removed = 0;
	const maxAttempts = 81 * 3; // Try up to 3 passes
	let attempts = 0;

	while (attempts < maxAttempts && removed < 81) {
		let progress = false;

		for (const idx of indices) {
			if (puzzle[idx] === 0) {
				continue; // Already removed
			}

			attempts++;
			if (attempts >= maxAttempts) {
				break;
			}

			// Temporarily remove digit
			const backup = puzzle[idx];
			puzzle[idx] = 0;

			// Check if puzzle is still solvable with techniques
			const solver = new TechniqueSolver(puzzle, puzzle);
			const log = solver.solveAll();

			if (!log.solved) {
				// Puzzle not solvable with techniques, restore
				puzzle[idx] = backup;
				continue;
			}

			// Calculate difficulty
			const difficulty = calculateDifficulty(log);

			// Check if difficulty matches target
			if (difficulty === targetDifficulty) {
				// Perfect match, keep removal
				removed++;
				progress = true;
				continue;
			}

			if (difficulty < targetDifficulty) {
				// Too easy, keep removing
				removed++;
				progress = true;
				continue;
			}

			// Too hard, restore digit
			puzzle[idx] = backup;
		}

		if (!progress) {
			// No progress made, break
			break;
		}

		// Re-check final difficulty
		const finalSolver = new TechniqueSolver(puzzle, puzzle);
		const finalLog = finalSolver.solveAll();
		const finalDifficulty = calculateDifficulty(finalLog);

		if (finalDifficulty === targetDifficulty) {
			break; // Achieved target
		}

		// If we're close enough (within 1), accept it
		if (Math.abs(finalDifficulty - targetDifficulty) <= 1) {
			break;
		}
	}

	// Calculate final difficulty
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
	if (targetDifficulty < 1 || targetDifficulty > 5) {
		throw new Error('Target difficulty must be between 1 and 5');
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

	// If current difficulty is lower, we need to remove more digits
	if (currentDifficulty < targetDifficulty) {
		// Find which cells we can remove to increase difficulty
		const indices = Array.from({ length: 81 }, (_, i) => i);
		shuffleArray(indices);

		let removed = 0;
		for (const idx of indices) {
			if (puzzle[idx] === 0) {
				continue; // Already empty
			}

			// Temporarily remove
			const backup = puzzle[idx];
			puzzle[idx] = 0;

			const solver = new TechniqueSolver(puzzle, puzzle);
			const log = solver.solveAll();

			if (!log.solved) {
				// Not solvable, restore
				puzzle[idx] = backup;
				continue;
			}

			const difficulty = calculateDifficulty(log);
			if (difficulty >= targetDifficulty) {
				removed++;
				if (difficulty === targetDifficulty) {
					break; // Perfect match
				}
			} else {
				// Still too easy, keep it removed
				removed++;
			}
		}
	} else {
		// Current difficulty is higher, we'd need to add digits (not implemented)
		// For now, just return current puzzle
		return {
			puzzle,
			difficulty: currentDifficulty,
			steps: 0,
		};
	}

	// Calculate final difficulty
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

