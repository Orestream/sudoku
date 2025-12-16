import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';
import { popcount, getCellName } from './utils';

/**
 * Naked Pair: Two cells in a unit contain the same two candidates,
 * allowing elimination of those candidates from other cells in the unit.
 * Difficulty: 4 (Medium-Hard) - One difficulty harder than Hidden Pair
 */
export function findNakedPair(grid: SolverGrid): TechniqueResult | null {
	// Check rows, columns, and boxes
	for (let row = 0; row < 9; row++) {
		const result = findNakedPairInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findNakedPairInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) return result;
	}

	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findNakedPairInUnit(
				grid,
				SolverGrid.getBoxIndices(br, bc),
				'box',
				br * 3 + bc,
			);
			if (result) return result;
		}
	}

	return null;
}

function findNakedPairInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	// Find all empty cells with exactly 2 candidates
	const cellsWithTwoCandidates: Array<{ index: number; candidates: number }> = [];
	for (const i of indices) {
		if (grid.getValue(i) !== 0) continue;
		const candidates = grid.getCandidates(i);
		const count = popcount(candidates);
		if (count === 2) {
			cellsWithTwoCandidates.push({ index: i, candidates });
		}
	}

	// Check all pairs
	for (let i = 0; i < cellsWithTwoCandidates.length; i++) {
		for (let j = i + 1; j < cellsWithTwoCandidates.length; j++) {
			const cell1 = cellsWithTwoCandidates[i]!;
			const cell2 = cellsWithTwoCandidates[j]!;

			// Check if they have the same two candidates
			if (cell1.candidates === cell2.candidates) {
				const eliminated: Array<{ index: number; digit: number }> = [];
				const pairMask = cell1.candidates;

				// Eliminate these candidates from other cells in the unit
				for (const idx of indices) {
					if (idx === cell1.index || idx === cell2.index) continue;
					if (grid.getValue(idx) !== 0) continue;

					for (let digit = 1; digit <= 9; digit++) {
						const bit = 1 << (digit - 1);
						if (pairMask & bit && grid.getCandidates(idx) & bit) {
							eliminated.push({ index: idx, digit });
						}
					}
				}

				if (eliminated.length > 0) {
					const unitName =
						unitType === 'row'
							? `row ${unitIndex + 1}`
							: unitType === 'col'
								? `column ${unitIndex + 1}`
								: `box ${unitIndex + 1}`;
					const digits = [];
					for (let d = 1; d <= 9; d++) {
						if (pairMask & (1 << (d - 1))) digits.push(d);
					}
					return {
						technique: 'naked_pair',
						applied: false,
						eliminatedCandidates: eliminated,
						message: `Naked Pair (${digits.join(',')}) in ${unitName} at ${getCellName(cell1.index)} and ${getCellName(cell2.index)}`,
						difficulty: 4,
						affectedCells: [cell1.index, cell2.index, ...eliminated.map((e) => e.index)],
					};
				}
			}
		}
	}

	return null;
}

/**
 * Hidden Triple: Three candidates appear only in three cells within a unit,
 * allowing elimination of other candidates from those cells.
 * Difficulty: 4 (Medium-Hard)
 */
export function findHiddenTriple(grid: SolverGrid): TechniqueResult | null {
	// Check rows, columns, and boxes
	for (let row = 0; row < 9; row++) {
		const result = findHiddenTripleInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findHiddenTripleInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) return result;
	}

	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findHiddenTripleInUnit(
				grid,
				SolverGrid.getBoxIndices(br, bc),
				'box',
				br * 3 + bc,
			);
			if (result) return result;
		}
	}

	return null;
}

function findHiddenTripleInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	// For each combination of 3 digits, check if they appear only in three cells
	for (let d1 = 1; d1 <= 9; d1++) {
		for (let d2 = d1 + 1; d2 <= 9; d2++) {
			for (let d3 = d2 + 1; d3 <= 9; d3++) {
				const bit1 = 1 << (d1 - 1);
				const bit2 = 1 << (d2 - 1);
				const bit3 = 1 << (d3 - 1);
				const tripleMask = bit1 | bit2 | bit3;
				const candidateCells: number[] = [];

				// Check if digits are already placed
				let alreadyPlaced = false;
				for (const i of indices) {
					if (grid.getValue(i) === d1 || grid.getValue(i) === d2 || grid.getValue(i) === d3) {
						alreadyPlaced = true;
						break;
					}
				}
				if (alreadyPlaced) continue;

				// Find cells that contain at least one of these digits
				for (const i of indices) {
					if (grid.getValue(i) !== 0) continue;
					if (grid.getCandidates(i) & tripleMask) {
						candidateCells.push(i);
					}
				}

				// Hidden triple: exactly 3 cells contain these digits
				if (candidateCells.length === 3) {
					const cell1 = candidateCells[0]!;
					const cell2 = candidateCells[1]!;
					const cell3 = candidateCells[2]!;
					const candidates1 = grid.getCandidates(cell1);
					const candidates2 = grid.getCandidates(cell2);
					const candidates3 = grid.getCandidates(cell3);

					// Check if any cell has other candidates to eliminate
					const otherCandidates1 = candidates1 & ~tripleMask;
					const otherCandidates2 = candidates2 & ~tripleMask;
					const otherCandidates3 = candidates3 & ~tripleMask;

					if (otherCandidates1 || otherCandidates2 || otherCandidates3) {
						const eliminated: Array<{ index: number; digit: number }> = [];

						for (let digit = 1; digit <= 9; digit++) {
							const bit = 1 << (digit - 1);
							if (bit & tripleMask) continue; // Skip the triple digits

							if (otherCandidates1 & bit) {
								eliminated.push({ index: cell1, digit });
							}
							if (otherCandidates2 & bit) {
								eliminated.push({ index: cell2, digit });
							}
							if (otherCandidates3 & bit) {
								eliminated.push({ index: cell3, digit });
							}
						}

						if (eliminated.length > 0) {
							const unitName =
								unitType === 'row'
									? `row ${unitIndex + 1}`
									: unitType === 'col'
										? `column ${unitIndex + 1}`
										: `box ${unitIndex + 1}`;
							return {
								technique: 'hidden_triple',
								applied: false,
								eliminatedCandidates: eliminated,
								message: `Hidden Triple (${d1},${d2},${d3}) in ${unitName} at ${getCellName(cell1)}, ${getCellName(cell2)}, ${getCellName(cell3)}`,
								difficulty: 4,
								affectedCells: [cell1, cell2, cell3],
							};
						}
					}
				}
			}
		}
	}

	return null;
}

/**
 * Pointing Triple: A candidate appears only in one row or column within a box (with 3 cells),
 * allowing elimination from the rest of that row/column.
 * Difficulty: 4 (Medium-Hard)
 */
export function findPointingTriple(grid: SolverGrid): TechniqueResult | null {
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

				// Must have exactly 3 cells
				if (candidateCells.length !== 3) {
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
							technique: 'pointing_triple',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `In box ${br * 3 + bc + 1}, digit ${digit} appears only in row ${row + 1}, eliminating it from the rest of the row (Pointing Triple)`,
							difficulty: 4,
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
							technique: 'pointing_triple',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `In box ${br * 3 + bc + 1}, digit ${digit} appears only in column ${col + 1}, eliminating it from the rest of the column (Pointing Triple)`,
							difficulty: 4,
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
 * Box-Line Reduction Triple: A candidate appears only in one box within a row or column (with 3 cells),
 * allowing elimination from the rest of that box.
 * Difficulty: 4 (Medium-Hard)
 */
export function findBoxLineReductionTriple(grid: SolverGrid): TechniqueResult | null {
	// Check rows
	for (let row = 0; row < 9; row++) {
		const result = findBoxLineReductionTripleInRow(grid, row);
		if (result) {
			return result;
		}
	}

	// Check columns
	for (let col = 0; col < 9; col++) {
		const result = findBoxLineReductionTripleInCol(grid, col);
		if (result) {
			return result;
		}
	}

	return null;
}

function findBoxLineReductionTripleInRow(grid: SolverGrid, row: number): TechniqueResult | null {
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

		// Must have exactly 3 cells
		if (candidateCells.length !== 3) {
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
					technique: 'box_line_reduction_triple',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `In row ${row + 1}, digit ${digit} appears only in box ${box + 1}, eliminating it from the rest of the box (Box-Line Reduction Triple)`,
					difficulty: 4,
					affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
				};
			}
		}
	}

	return null;
}

function findBoxLineReductionTripleInCol(grid: SolverGrid, col: number): TechniqueResult | null {
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

		// Must have exactly 3 cells
		if (candidateCells.length !== 3) {
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
					technique: 'box_line_reduction_triple',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `In column ${col + 1}, digit ${digit} appears only in box ${box + 1}, eliminating it from the rest of the box (Box-Line Reduction Triple)`,
					difficulty: 4,
					affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
				};
			}
		}
	}

	return null;
}

