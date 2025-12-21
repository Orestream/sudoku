/**
 * Bruteforce technique - DEVELOPMENT ONLY
 *
 * This technique uses backtracking to find the solution when no other
 * technique can make progress but the puzzle has a unique solution.
 *
 * This should NOT be enabled in production as it defeats the purpose
 * of logical solving. It's useful for:
 * - Testing puzzle generation
 * - Verifying that puzzles are solvable
 * - Development of new techniques
 *
 * Difficulty: 10 (Grandmaster) - but only as a fallback
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { getCellName } from '../utils';

/**
 * Feature flag to enable/disable bruteforce.
 * Set to false for production builds.
 */
export const BRUTEFORCE_ENABLED = true; // TODO: Set to false for production

/**
 * Try to solve the puzzle using backtracking.
 * Returns the solution if unique, null otherwise.
 */
function solveBruteforce(values: number[]): number[] | null {
    const grid = [...values];

    // Find all empty cells
    const emptyCells: number[] = [];
    for (let i = 0; i < 81; i++) {
        if (grid[i] === 0) {
            emptyCells.push(i);
        }
    }

    if (emptyCells.length === 0) {
        return grid; // Already solved
    }

    // Check if a value is valid at a position
    const isValid = (idx: number, val: number): boolean => {
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        // Check row
        for (let c = 0; c < 9; c++) {
            if (grid[row * 9 + c] === val) return false;
        }

        // Check column
        for (let r = 0; r < 9; r++) {
            if (grid[r * 9 + col] === val) return false;
        }

        // Check box
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (grid[(boxRow + r) * 9 + (boxCol + c)] === val) return false;
            }
        }

        return true;
    };

    let solutionCount = 0;
    let solution: number[] | null = null;

    const solve = (cellIdx: number): boolean => {
        if (cellIdx >= emptyCells.length) {
            solutionCount++;
            if (solutionCount === 1) {
                solution = [...grid];
            }
            return solutionCount > 1; // Stop if we find more than one solution
        }

        const idx = emptyCells[cellIdx]!;

        for (let val = 1; val <= 9; val++) {
            if (isValid(idx, val)) {
                grid[idx] = val;
                if (solve(cellIdx + 1)) {
                    grid[idx] = 0;
                    return true; // Found multiple solutions
                }
                grid[idx] = 0;
            }
        }

        return false;
    };

    solve(0);

    return solutionCount === 1 ? solution : null;
}

/**
 * Bruteforce technique: Find the next cell to solve using backtracking.
 * Only activates when:
 * 1. BRUTEFORCE_ENABLED is true
 * 2. The puzzle has a unique solution
 * 3. There are empty cells remaining
 */
export function findBruteforce(grid: SolverGrid): TechniqueResult | null {
    if (!BRUTEFORCE_ENABLED) {
        return null;
    }

    // Get current grid state
    const values: number[] = [];
    for (let i = 0; i < 81; i++) {
        values.push(grid.getValue(i));
    }

    // Check if there are empty cells
    const firstEmpty = values.findIndex((v) => v === 0);
    if (firstEmpty === -1) {
        return null; // Already solved
    }

    // Try to find the unique solution
    const solution = solveBruteforce(values);

    if (!solution) {
        return null; // No unique solution or multiple solutions
    }

    // Find the first difference between current state and solution
    for (let i = 0; i < 81; i++) {
        if (values[i] === 0 && solution[i] !== 0) {
            const digit = solution[i]!;

            return {
                technique: 'bruteforce' as any, // Not a standard technique
                applied: false,
                solvedCells: [{ index: i, value: digit }],
                message: `Bruteforce: Cell ${getCellName(i)} must be ${digit} (unique solution)`,
                difficulty: 10,
                affectedCells: [i],
            };
        }
    }

    return null;
}
