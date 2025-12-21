import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';

/**
 * WXYZ-Wing: An extension of XYZ-Wing where we have a "hinge" cell and 3 wing cells.
 * The combined candidates of all 4 cells must be exactly 4 digits (W, X, Y, Z).
 * The common candidate Z must appear in all 4 cells.
 * Z can be eliminated from any cell that sees all 4 cells of the pattern.
 * Difficulty: 10 (Grandmaster)
 */
export function findWXYZWing(grid: SolverGrid): TechniqueResult | null {
	// Collect all cells with 2-4 candidates
	const cells: Array<{
		index: number;
		mask: number;
		digits: number[];
		row: number;
		col: number;
		box: number;
	}> = [];

	for (let idx = 0; idx < 81; idx++) {
		if (grid.getValue(idx) !== 0) continue;

		const mask = grid.getCandidates(idx);
		const count = popcount(mask);

		if (count >= 2 && count <= 4) {
			const digits: number[] = [];
			for (let d = 1; d <= 9; d++) {
				if (mask & (1 << (d - 1))) {
					digits.push(d);
				}
			}
			const row = Math.floor(idx / 9);
			const col = idx % 9;
			const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
			cells.push({ index: idx, mask, digits, row, col, box });
		}
	}

	if (cells.length < 4) return null;

	// Helper to check if two cells see each other
	const seeEachOther = (
		c1: { row: number; col: number; box: number },
		c2: { row: number; col: number; box: number },
	): boolean => {
		return c1.row === c2.row || c1.col === c2.col || c1.box === c2.box;
	};

	// Try each cell as the pivot/hinge
	for (let i = 0; i < cells.length; i++) {
		const pivot = cells[i]!;

		// Find cells that can see the pivot
		const potentialWings = cells.filter((c, idx) => idx !== i && seeEachOther(pivot, c));

		if (potentialWings.length < 3) continue;

		// Try all combinations of 3 wings
		for (let j = 0; j < potentialWings.length; j++) {
			const wing1 = potentialWings[j]!;
			for (let k = j + 1; k < potentialWings.length; k++) {
				const wing2 = potentialWings[k]!;
				for (let l = k + 1; l < potentialWings.length; l++) {
					const wing3 = potentialWings[l]!;

					// Combined mask of all 4 cells
					const combinedMask = pivot.mask | wing1.mask | wing2.mask | wing3.mask;

					// Must have exactly 4 candidates total
					if (popcount(combinedMask) !== 4) continue;

					// Find the common candidate Z that appears in all 4 cells
					const commonMask = pivot.mask & wing1.mask & wing2.mask & wing3.mask;
					if (popcount(commonMask) === 0) continue;

					// Z is the common candidate
					let zDigit = 0;
					for (let d = 1; d <= 9; d++) {
						if (commonMask & (1 << (d - 1))) {
							zDigit = d;
							break;
						}
					}
					if (zDigit === 0) continue;

					const zBit = 1 << (zDigit - 1);
					const pattern = [pivot, wing1, wing2, wing3];

					// Find cells that see ALL FOUR pattern cells and have Z as candidate
					const eliminated: Array<{ index: number; digit: number }> = [];

					for (let idx = 0; idx < 81; idx++) {
						if (grid.getValue(idx) !== 0) continue;
						if (!(grid.getCandidates(idx) & zBit)) continue;

						// Skip pattern cells
						if (pattern.some((p) => p.index === idx)) continue;

						const row = Math.floor(idx / 9);
						const col = idx % 9;
						const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

						// Must see all 4 pattern cells
						const seesAll = pattern.every(
							(p) => row === p.row || col === p.col || box === p.box,
						);
						if (!seesAll) continue;

						eliminated.push({ index: idx, digit: zDigit });
					}

					if (eliminated.length > 0) {
						// Extract the 4 digits for the message
						const allDigits: number[] = [];
						for (let d = 1; d <= 9; d++) {
							if (combinedMask & (1 << (d - 1))) {
								allDigits.push(d);
							}
						}

						return {
							technique: 'wxyz_wing',
							applied: true,
							eliminatedCandidates: eliminated,
							message: `WXYZ-Wing: Cells ${getCellName(pivot.index)}, ${getCellName(wing1.index)}, ${getCellName(wing2.index)}, ${getCellName(wing3.index)} form a pattern with candidates ${allDigits.join('')}. Common candidate ${zDigit} can be eliminated from cells seeing all four.`,
							difficulty: 10,
							affectedCells: pattern.map((p) => p.index),
						};
					}
				}
			}
		}
	}

	return null;
}
