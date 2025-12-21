/**
 * Hard link (conjugate pair) utilities for chain-based techniques.
 */

import { SolverGrid } from '../../grid';

/**
 * A hard link represents two cells in a unit where a digit can only appear in those two cells.
 * This is also known as a "conjugate pair" or "strong link".
 */
export type HardLink = {
	cell1: number; // First cell index
	cell2: number; // Second cell index
	digit: number; // The digit that forms the hard link
	unitType: 'row' | 'col' | 'box'; // The type of unit containing the link
	unitIndex: number; // The index of the unit (0-8)
};

/**
 * Find all hard links for a specific digit in the grid.
 * A hard link exists when a digit appears as a candidate in exactly two cells within a unit.
 */
export function findHardLinks(grid: SolverGrid, digit: number): HardLink[] {
	const bit = 1 << (digit - 1);
	const links: HardLink[] = [];

	// Check rows
	for (let row = 0; row < 9; row++) {
		const cells: number[] = [];
		for (let col = 0; col < 9; col++) {
			const idx = row * 9 + col;
			if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
				cells.push(idx);
			}
		}
		if (cells.length === 2) {
			links.push({
				cell1: cells[0]!,
				cell2: cells[1]!,
				digit,
				unitType: 'row',
				unitIndex: row,
			});
		}
	}

	// Check columns
	for (let col = 0; col < 9; col++) {
		const cells: number[] = [];
		for (let row = 0; row < 9; row++) {
			const idx = row * 9 + col;
			if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
				cells.push(idx);
			}
		}
		if (cells.length === 2) {
			links.push({
				cell1: cells[0]!,
				cell2: cells[1]!,
				digit,
				unitType: 'col',
				unitIndex: col,
			});
		}
	}

	// Check boxes
	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const cells: number[] = [];
			for (let r = 0; r < 3; r++) {
				for (let c = 0; c < 3; c++) {
					const row = br * 3 + r;
					const col = bc * 3 + c;
					const idx = row * 9 + col;
					if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
						cells.push(idx);
					}
				}
			}
			if (cells.length === 2) {
				links.push({
					cell1: cells[0]!,
					cell2: cells[1]!,
					digit,
					unitType: 'box',
					unitIndex: br * 3 + bc,
				});
			}
		}
	}

	return links;
}
