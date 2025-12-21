import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';
/**
 * W-Wing: Two cells with the same two candidates (XY) are connected by a chain
 * of cells containing X, allowing elimination of Y from cells that see both endpoints.
 *
 * Pattern: Two bivalue cells with the same candidates (XY), connected by a strong link
 * (conjugate pair) for digit X in either a row, column, or box. This forces Y to be
 * eliminated from any cell that can see both endpoints.
 *
 * Difficulty: 8 (Expert+)
 */
export function findWWing(grid: SolverGrid): TechniqueResult | null {
	// Find all cells with exactly 2 candidates (bivalue cells)
	const bivalueCells: Array<{ index: number; mask: number; digits: number[] }> = [];

	for (let idx = 0; idx < 81; idx++) {
		if (grid.getValue(idx) !== 0) continue;

		const mask = grid.getCandidates(idx);
		if (popcount(mask) === 2) {
			const digits: number[] = [];
			for (let d = 1; d <= 9; d++) {
				if (mask & (1 << (d - 1))) {
					digits.push(d);
				}
			}
			bivalueCells.push({ index: idx, mask, digits });
		}
	}

	// Group bivalue cells by their candidate pair
	const cellsByPair = new Map<string, typeof bivalueCells>();
	for (const cell of bivalueCells) {
		const key = `${cell.digits[0]}-${cell.digits[1]}`;
		if (!cellsByPair.has(key)) {
			cellsByPair.set(key, []);
		}
		cellsByPair.get(key)!.push(cell);
	}

	// For each pair type with at least 2 cells
	for (const [pairKey, cells] of cellsByPair.entries()) {
		if (cells.length < 2) continue;

		const [x, y] = pairKey.split('-').map(Number);
		if (!x || !y) continue;

		// Try all pairs of cells with the same candidates
		for (let i = 0; i < cells.length; i++) {
			const cell1 = cells[i];
			if (!cell1) continue;

			for (let j = i + 1; j < cells.length; j++) {
				const cell2 = cells[j];
				if (!cell2) continue;

				// Check if these two cells are connected by a strong link for X or Y
				// Try X as the linking digit
				const linkX = findStrongLink(grid, cell1.index, cell2.index, x);
				if (linkX) {
					const eliminated = eliminateFromWWing(grid, cell1.index, cell2.index, y);
					if (eliminated.length > 0) {
						return {
							technique: 'w_wing',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `W-Wing: cells ${getCellName(cell1.index)} and ${getCellName(cell2.index)} both have candidates ${x}${y}, connected by strong link on ${x}, eliminating ${y} from cells seeing both`,
							difficulty: 8,
							affectedCells: [
								cell1.index,
								cell2.index,
								...eliminated.map((e) => e.index),
							],
						};
					}
				}

				// Try Y as the linking digit
				const linkY = findStrongLink(grid, cell1.index, cell2.index, y);
				if (linkY) {
					const eliminated = eliminateFromWWing(grid, cell1.index, cell2.index, x);
					if (eliminated.length > 0) {
						return {
							technique: 'w_wing',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `W-Wing: cells ${getCellName(cell1.index)} and ${getCellName(cell2.index)} both have candidates ${x}${y}, connected by strong link on ${y}, eliminating ${x} from cells seeing both`,
							difficulty: 8,
							affectedCells: [
								cell1.index,
								cell2.index,
								...eliminated.map((e) => e.index),
							],
						};
					}
				}
			}
		}
	}

	return null;
}

/**
 * Check if two cells are connected by a strong link (conjugate pair) for a given digit.
 * This means they are the only two cells in a row, column, or box that can contain the digit.
 */
function findStrongLink(grid: SolverGrid, idx1: number, idx2: number, digit: number): boolean {
	const bit = 1 << (digit - 1);

	const row1 = Math.floor(idx1 / 9);
	const col1 = idx1 % 9;
	const box1 = Math.floor(row1 / 3) * 3 + Math.floor(col1 / 3);

	const row2 = Math.floor(idx2 / 9);
	const col2 = idx2 % 9;
	const box2 = Math.floor(row2 / 3) * 3 + Math.floor(col2 / 3);

	// Check if they share a row and are the only two cells with this digit in that row
	if (row1 === row2) {
		let count = 0;
		for (let c = 0; c < 9; c++) {
			const idx = row1 * 9 + c;
			if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
				count++;
				if (count > 2) return false;
			}
		}
		if (count === 2) return true;
	}

	// Check if they share a column and are the only two cells with this digit in that column
	if (col1 === col2) {
		let count = 0;
		for (let r = 0; r < 9; r++) {
			const idx = r * 9 + col1;
			if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
				count++;
				if (count > 2) return false;
			}
		}
		if (count === 2) return true;
	}

	// Check if they share a box and are the only two cells with this digit in that box
	if (box1 === box2) {
		let count = 0;
		const boxRow = Math.floor(box1 / 3);
		const boxCol = box1 % 3;
		for (let r = 0; r < 3; r++) {
			for (let c = 0; c < 3; c++) {
				const idx = (boxRow * 3 + r) * 9 + (boxCol * 3 + c);
				if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
					count++;
					if (count > 2) return false;
				}
			}
		}
		if (count === 2) return true;
	}

	return false;
}

/**
 * Find cells that can see both endpoints and eliminate the specified digit.
 */
function eliminateFromWWing(
	grid: SolverGrid,
	idx1: number,
	idx2: number,
	digit: number,
): Array<{ index: number; digit: number }> {
	const bit = 1 << (digit - 1);
	const eliminated: Array<{ index: number; digit: number }> = [];

	const row1 = Math.floor(idx1 / 9);
	const col1 = idx1 % 9;
	const box1 = Math.floor(row1 / 3) * 3 + Math.floor(col1 / 3);

	const row2 = Math.floor(idx2 / 9);
	const col2 = idx2 % 9;
	const box2 = Math.floor(row2 / 3) * 3 + Math.floor(col2 / 3);

	for (let idx = 0; idx < 81; idx++) {
		if (grid.getValue(idx) !== 0) continue;
		if (!(grid.getCandidates(idx) & bit)) continue;
		if (idx === idx1 || idx === idx2) continue;

		const row = Math.floor(idx / 9);
		const col = idx % 9;
		const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

		// Check if sees both endpoints
		const sees1 = row === row1 || col === col1 || box === box1;
		const sees2 = row === row2 || col === col2 || box === box2;

		if (sees1 && sees2) {
			eliminated.push({ index: idx, digit });
		}
	}

	return eliminated;
}
