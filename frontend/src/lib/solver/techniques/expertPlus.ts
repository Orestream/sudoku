import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';
import { popcount, getCellName } from './utils';

/**
 * XY-Wing: Three cells form a pattern where one cell (pivot) shares candidates
 * with two other cells (wings), and the wings share a candidate that can be
 * eliminated from cells that see both wings.
 *
 * Pattern: Pivot has candidates XY, Wing1 has XZ, Wing2 has YZ.
 * The pivot shares X with Wing1 and Y with Wing2.
 * Any cell that sees both Wing1 and Wing2 can have Z eliminated.
 *
 * Difficulty: 8 (Expert+)
 */
export function findXYWing(grid: SolverGrid): TechniqueResult | null {
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

	// Need at least 3 bivalue cells for XY-Wing
	if (bivalueCells.length < 3) return null;

	// Try each bivalue cell as the pivot
	for (const pivot of bivalueCells) {
		const [x, y] = pivot.digits;
		if (!x || !y) continue;

		const pivotRow = Math.floor(pivot.index / 9);
		const pivotCol = pivot.index % 9;
		const pivotBox = Math.floor(pivotRow / 3) * 3 + Math.floor(pivotCol / 3);

		// Find potential wings that can "see" the pivot
		const potentialWings = bivalueCells.filter(cell => {
			if (cell.index === pivot.index) return false;

			const cellRow = Math.floor(cell.index / 9);
			const cellCol = cell.index % 9;
			const cellBox = Math.floor(cellRow / 3) * 3 + Math.floor(cellCol / 3);

			// Must see the pivot
			return cellRow === pivotRow || cellCol === pivotCol || cellBox === pivotBox;
		});

		// Try pairs of potential wings
		for (let i = 0; i < potentialWings.length; i++) {
			const wing1 = potentialWings[i];
			if (!wing1) continue;

			const [a1, b1] = wing1.digits;
			if (!a1 || !b1) continue;

			// Wing1 must share exactly one candidate with pivot
			// Check if wing1 has pattern XZ (shares X with pivot)
			let sharedWithPivot1: number | null = null;
			let uniqueToWing1: number | null = null;

			if (a1 === x || a1 === y) {
				sharedWithPivot1 = a1;
				uniqueToWing1 = b1;
			} else if (b1 === x || b1 === y) {
				sharedWithPivot1 = b1;
				uniqueToWing1 = a1;
			} else {
				continue; // Wing1 doesn't share any candidate with pivot
			}

			for (let j = i + 1; j < potentialWings.length; j++) {
				const wing2 = potentialWings[j];
				if (!wing2) continue;

				const [a2, b2] = wing2.digits;
				if (!a2 || !b2) continue;

				// Wing2 must share the OTHER candidate with pivot
				let sharedWithPivot2: number | null = null;
				let uniqueToWing2: number | null = null;

				if (a2 === x || a2 === y) {
					sharedWithPivot2 = a2;
					uniqueToWing2 = b2;
				} else if (b2 === x || b2 === y) {
					sharedWithPivot2 = b2;
					uniqueToWing2 = a2;
				} else {
					continue; // Wing2 doesn't share any candidate with pivot
				}

				// Wings must share different candidates with pivot
				if (sharedWithPivot1 === sharedWithPivot2) continue;

				// Wings must share the same unique candidate (Z)
				if (uniqueToWing1 !== uniqueToWing2) continue;

				const z = uniqueToWing1;
				const zBit = 1 << (z - 1);

				// Now we have a valid XY-Wing pattern
				// Find cells that see both wings and eliminate Z from them
				const wing1Row = Math.floor(wing1.index / 9);
				const wing1Col = wing1.index % 9;
				const wing1Box = Math.floor(wing1Row / 3) * 3 + Math.floor(wing1Col / 3);

				const wing2Row = Math.floor(wing2.index / 9);
				const wing2Col = wing2.index % 9;
				const wing2Box = Math.floor(wing2Row / 3) * 3 + Math.floor(wing2Col / 3);

				const eliminated: Array<{ index: number; digit: number }> = [];

				for (let idx = 0; idx < 81; idx++) {
					if (grid.getValue(idx) !== 0) continue;
					if (!(grid.getCandidates(idx) & zBit)) continue;

					// Skip the XY-Wing cells themselves
					if (idx === pivot.index || idx === wing1.index || idx === wing2.index) continue;

					const row = Math.floor(idx / 9);
					const col = idx % 9;
					const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

					// Check if sees wing1
					const seesWing1 = row === wing1Row || col === wing1Col || box === wing1Box;
					if (!seesWing1) continue;

					// Check if sees wing2
					const seesWing2 = row === wing2Row || col === wing2Col || box === wing2Box;
					if (!seesWing2) continue;

					eliminated.push({ index: idx, digit: z });
				}

				if (eliminated.length > 0) {
					return {
						technique: 'xy_wing',
						applied: false,
						eliminatedCandidates: eliminated,
						message: `XY-Wing: pivot ${getCellName(pivot.index)} (${x}${y}) with wings ${getCellName(wing1.index)} (${sharedWithPivot1}${z}) and ${getCellName(wing2.index)} (${sharedWithPivot2}${z}), eliminating ${z} from cells seeing both wings`,
						difficulty: 8,
						affectedCells: [pivot.index, wing1.index, wing2.index, ...eliminated.map(e => e.index)],
					};
				}
			}
		}
	}

	return null;
}

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
							affectedCells: [cell1.index, cell2.index, ...eliminated.map(e => e.index)],
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
							affectedCells: [cell1.index, cell2.index, ...eliminated.map(e => e.index)],
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
			if (grid.getValue(idx) === 0 && (grid.getCandidates(idx) & bit)) {
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
			if (grid.getValue(idx) === 0 && (grid.getCandidates(idx) & bit)) {
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
				if (grid.getValue(idx) === 0 && (grid.getCandidates(idx) & bit)) {
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

