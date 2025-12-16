import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';

/**
 * Count the number of set bits in a bitmask.
 */
export function popcount(n: number): number {
	let count = 0;
	while (n) {
		n &= n - 1;
		count++;
	}
	return count;
}

/**
 * Get the single digit from a bitmask (assumes only one bit is set).
 */
export function getSingleDigit(mask: number): number | null {
	if (popcount(mask) !== 1) {
		return null;
	}
	// Find which bit is set
	for (let d = 1; d <= 9; d++) {
		if (mask & (1 << (d - 1))) {
			return d;
		}
	}
	return null;
}

/**
 * Get a human-readable cell name (e.g., "R1C1" for row 1, column 1).
 */
export function getCellName(index: number): string {
	const row = Math.floor(index / 9) + 1;
	const col = (index % 9) + 1;
	return `R${row}C${col}`;
}

/**
 * Apply a technique result to the grid.
 */
export function applyTechnique(grid: SolverGrid, result: TechniqueResult): void {
	if (result.solvedCells) {
		for (const cell of result.solvedCells) {
			grid.setValue(cell.index, cell.value);
		}
	}

	if (result.eliminatedCandidates) {
		for (const elim of result.eliminatedCandidates) {
			grid.eliminateCandidate(elim.index, elim.digit);
		}
	}
}
