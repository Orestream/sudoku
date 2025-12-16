import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';
import { getSingleDigit, getCellName } from './utils';

/**
 * Naked Single: A cell with only one candidate.
 * Difficulty: 2 (Easy)
 */
export function findNakedSingle(grid: SolverGrid): TechniqueResult | null {
	for (let i = 0; i < 81; i++) {
		if (grid.getValue(i) !== 0) {
			continue;
		}
		const candidates = grid.getCandidates(i);
		const digit = getSingleDigit(candidates);
		if (digit !== null) {
			return {
				technique: 'naked_single',
				applied: false,
				solvedCells: [{ index: i, value: digit }],
				message: `Cell ${getCellName(i)} can only contain ${digit} (Naked Single)`,
				difficulty: 2,
				affectedCells: [i],
			};
		}
	}
	return null;
}

/**
 * Pointing Pair: A candidate appears only in one row or column within a box,
 * allowing elimination from the rest of that row/column.
 * Difficulty: 2 (Easy)
 */
export function findPointingPair(grid: SolverGrid): TechniqueResult | null {
	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const boxIndices = SolverGrid.getBoxIndices(br, bc);

			// For each digit, check if it appears only in one row or column within the box
			for (let digit = 1; digit <= 9; digit++) {
				const bit = 1 << (digit - 1);
				const candidateCells: number[] = [];

				for (const i of boxIndices) {
					if (grid.getValue(i) === digit) {
						// Digit already placed
						candidateCells.length = 0;
						break;
					}
					if (grid.getCandidates(i) & bit) {
						candidateCells.push(i);
					}
				}

				if (candidateCells.length < 2 || candidateCells.length > 3) {
					continue;
				}

				// Check if all candidates are in the same row
				const rows = new Set(candidateCells.map((i) => Math.floor(i / 9)));
				if (rows.size === 1) {
					const row = Array.from(rows)[0]!;
					const eliminated: Array<{ index: number; digit: number }> = [];

					// Eliminate from the rest of the row
					for (const i of SolverGrid.getRowIndices(row)) {
						if (!boxIndices.includes(i) && grid.getCandidates(i) & bit) {
							eliminated.push({ index: i, digit });
						}
					}

					if (eliminated.length > 0) {
						return {
							technique: 'pointing_pair',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `In box ${br * 3 + bc + 1}, digit ${digit} appears only in row ${row + 1}, eliminating it from the rest of the row (Pointing Pair)`,
							difficulty: 2,
							affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
						};
					}
				}

				// Check if all candidates are in the same column
				const cols = new Set(candidateCells.map((i) => i % 9));
				if (cols.size === 1) {
					const col = Array.from(cols)[0]!;
					const eliminated: Array<{ index: number; digit: number }> = [];

					// Eliminate from the rest of the column
					for (const i of SolverGrid.getColIndices(col)) {
						if (!boxIndices.includes(i) && grid.getCandidates(i) & bit) {
							eliminated.push({ index: i, digit });
						}
					}

					if (eliminated.length > 0) {
						return {
							technique: 'pointing_pair',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `In box ${br * 3 + bc + 1}, digit ${digit} appears only in column ${col + 1}, eliminating it from the rest of the column (Pointing Pair)`,
							difficulty: 2,
							affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
						};
					}
				}
			}
		}
	}

	return null;
}

/**
 * Box-Line Reduction: A candidate appears only in one box within a row or column,
 * allowing elimination from the rest of that box.
 * Difficulty: 2 (Easy)
 */
export function findBoxLineReduction(grid: SolverGrid): TechniqueResult | null {
	// Check rows
	for (let row = 0; row < 9; row++) {
		const result = findBoxLineReductionInRow(grid, row);
		if (result) {
			return result;
		}
	}

	// Check columns
	for (let col = 0; col < 9; col++) {
		const result = findBoxLineReductionInCol(grid, col);
		if (result) {
			return result;
		}
	}

	return null;
}

function findBoxLineReductionInRow(grid: SolverGrid, row: number): TechniqueResult | null {
	const rowIndices = SolverGrid.getRowIndices(row);

	for (let digit = 1; digit <= 9; digit++) {
		const bit = 1 << (digit - 1);
		const candidateCells: number[] = [];

		// Check if digit is already placed in row
		for (const i of rowIndices) {
			if (grid.getValue(i) === digit) {
				candidateCells.length = 0;
				break;
			}
			if (grid.getCandidates(i) & bit) {
				candidateCells.push(i);
			}
		}

		if (candidateCells.length < 2) {
			continue;
		}

		// Check if all candidates are in the same box
		const boxes = new Set(
			candidateCells.map((i) => {
				const r = Math.floor(i / 9);
				const c = i % 9;
				return Math.floor(r / 3) * 3 + Math.floor(c / 3);
			}),
		);

		if (boxes.size === 1) {
			const box = Array.from(boxes)[0]!;
			const boxRow = Math.floor(box / 3);
			const boxCol = box % 3;
			const boxIndices = SolverGrid.getBoxIndices(boxRow, boxCol);
			const eliminated: Array<{ index: number; digit: number }> = [];

			// Eliminate from the rest of the box
			for (const i of boxIndices) {
				if (!rowIndices.includes(i) && grid.getCandidates(i) & bit) {
					eliminated.push({ index: i, digit });
				}
			}

			if (eliminated.length > 0) {
				return {
					technique: 'box_line_reduction',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `In row ${row + 1}, digit ${digit} appears only in box ${box + 1}, eliminating it from the rest of the box (Box-Line Reduction)`,
					difficulty: 2,
					affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
				};
			}
		}
	}

	return null;
}

function findBoxLineReductionInCol(grid: SolverGrid, col: number): TechniqueResult | null {
	const colIndices = SolverGrid.getColIndices(col);

	for (let digit = 1; digit <= 9; digit++) {
		const bit = 1 << (digit - 1);
		const candidateCells: number[] = [];

		// Check if digit is already placed in column
		for (const i of colIndices) {
			if (grid.getValue(i) === digit) {
				candidateCells.length = 0;
				break;
			}
			if (grid.getCandidates(i) & bit) {
				candidateCells.push(i);
			}
		}

		if (candidateCells.length < 2) {
			continue;
		}

		// Check if all candidates are in the same box
		const boxes = new Set(
			candidateCells.map((i) => {
				const r = Math.floor(i / 9);
				const c = i % 9;
				return Math.floor(r / 3) * 3 + Math.floor(c / 3);
			}),
		);

		if (boxes.size === 1) {
			const box = Array.from(boxes)[0]!;
			const boxRow = Math.floor(box / 3);
			const boxCol = box % 3;
			const boxIndices = SolverGrid.getBoxIndices(boxRow, boxCol);
			const eliminated: Array<{ index: number; digit: number }> = [];

			// Eliminate from the rest of the box
			for (const i of boxIndices) {
				if (!colIndices.includes(i) && grid.getCandidates(i) & bit) {
					eliminated.push({ index: i, digit });
				}
			}

			if (eliminated.length > 0) {
				return {
					technique: 'box_line_reduction',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `In column ${col + 1}, digit ${digit} appears only in box ${box + 1}, eliminating it from the rest of the box (Box-Line Reduction)`,
					difficulty: 2,
					affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
				};
			}
		}
	}

	return null;
}

