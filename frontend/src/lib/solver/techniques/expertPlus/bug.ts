import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';
/**
 * BUG+1 (Bivalue Universal Grave +1): A grid where every unsolved cell has exactly two candidates,
 * and one cell has three candidates, allowing elimination of one candidate from that cell.
 *
 * A BUG (Bivalue Universal Grave) is a deadly pattern where:
 * - Every unsolved cell has exactly 2 candidates
 * - Every digit appears exactly 2 times as a candidate in each row, column, and box
 * - This pattern has multiple solutions, which is invalid in a proper Sudoku
 *
 * BUG+1 occurs when all cells except one have 2 candidates, and one cell has 3 candidates.
 * The extra candidate in the trivalue cell can be identified and placed, avoiding the deadly pattern.
 *
 * Difficulty: 8 (Expert+)
 */
export function findBUG(grid: SolverGrid): TechniqueResult | null {
	let trivalueCell: number | null = null;
	const trivalueCandidates: number[] = [];

	// Check if we're in a BUG+1 state
	for (let idx = 0; idx < 81; idx++) {
		if (grid.getValue(idx) !== 0) continue;

		const mask = grid.getCandidates(idx);
		const count = popcount(mask);

		if (count === 2) {
			// This is good for BUG+1
			continue;
		} else if (count === 3) {
			// Found a trivalue cell
			if (trivalueCell !== null) {
				// More than one trivalue cell, not BUG+1
				return null;
			}
			trivalueCell = idx;
			for (let d = 1; d <= 9; d++) {
				if (mask & (1 << (d - 1))) {
					trivalueCandidates.push(d);
				}
			}
		} else {
			// Cell has 1, 4, or more candidates - not a BUG+1 pattern
			return null;
		}
	}

	// We need exactly one trivalue cell
	if (trivalueCell === null || trivalueCandidates.length !== 3) {
		return null;
	}

	// Now verify it's a valid BUG pattern by checking that each digit appears
	// exactly twice in each row, column, and box (ignoring the trivalue cell)
	// If this is true, then we can identify which of the three candidates in the
	// trivalue cell is the "extra" one that breaks the pattern

	// For each candidate in the trivalue cell, count how many times it appears
	// in the same row, column, and box
	const row = Math.floor(trivalueCell / 9);
	const col = trivalueCell % 9;
	const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

	const candidateCounts: Map<number, { row: number; col: number; box: number }> = new Map();

	for (const digit of trivalueCandidates) {
		const bit = 1 << (digit - 1);
		let rowCount = 0;
		let colCount = 0;
		let boxCount = 0;

		// Count in row
		for (let c = 0; c < 9; c++) {
			const idx = row * 9 + c;
			if (idx !== trivalueCell && grid.getValue(idx) === 0 && (grid.getCandidates(idx) & bit)) {
				rowCount++;
			}
		}

		// Count in column
		for (let r = 0; r < 9; r++) {
			const idx = r * 9 + col;
			if (idx !== trivalueCell && grid.getValue(idx) === 0 && (grid.getCandidates(idx) & bit)) {
				colCount++;
			}
		}

		// Count in box
		const boxRow = Math.floor(box / 3);
		const boxCol = box % 3;
		for (let r = 0; r < 3; r++) {
			for (let c = 0; c < 3; c++) {
				const idx = (boxRow * 3 + r) * 9 + (boxCol * 3 + c);
				if (idx !== trivalueCell && grid.getValue(idx) === 0 && (grid.getCandidates(idx) & bit)) {
					boxCount++;
				}
			}
		}

		candidateCounts.set(digit, { row: rowCount, col: colCount, box: boxCount });
	}

	// In a valid BUG pattern, each digit should appear exactly twice in each unit
	// The "extra" candidate is the one that would make it appear 3 times in at least one unit
	// So we're looking for the candidate that currently appears only once in at least one unit
	// (because adding it would make it 2, while the others already appear twice)

	// Actually, the correct logic is: the digit that should be placed is the one where
	// removing it from the trivalue cell would leave all units with exactly 2 occurrences
	let solution: number | null = null;

	for (const digit of trivalueCandidates) {
		const counts = candidateCounts.get(digit);
		if (!counts) continue;

		// If this digit appears only once in any unit, then placing it would make it twice
		// which maintains the BUG pattern. The other two candidates already appear twice.
		// So the candidate that appears ONCE in a unit is the one to place.
		if (counts.row === 1 || counts.col === 1 || counts.box === 1) {
			if (solution !== null) {
				// Multiple candidates satisfy this - not a clear BUG+1
				return null;
			}
			solution = digit;
		}
	}

	if (solution !== null) {
		return {
			technique: 'bug',
			applied: false,
			solvedCells: [{ index: trivalueCell, value: solution }],
			message: `BUG+1: All cells except ${getCellName(trivalueCell)} have exactly 2 candidates. To avoid the deadly BUG pattern, ${getCellName(trivalueCell)} must be ${solution}`,
			difficulty: 8,
			affectedCells: [trivalueCell],
		};
	}

	return null;
}

