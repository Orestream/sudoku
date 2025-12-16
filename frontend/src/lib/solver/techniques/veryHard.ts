import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';
import { popcount, getCellName } from './utils';

/**
 * X-Wing: A candidate appears exactly twice in two rows (or columns),
 * and those occurrences align in two columns (or rows), allowing elimination
 * of the candidate from other cells in those columns (or rows).
 * Difficulty: 6 (Very Hard)
 */
export function findXWing(grid: SolverGrid): TechniqueResult | null {
	// Check X-Wing in rows (eliminate from columns)
	for (let digit = 1; digit <= 9; digit++) {
		const result = findXWingInRows(grid, digit);
		if (result) {
			return result;
		}
	}

	// Check X-Wing in columns (eliminate from rows)
	for (let digit = 1; digit <= 9; digit++) {
		const result = findXWingInColumns(grid, digit);
		if (result) {
			return result;
		}
	}

	return null;
}

function findXWingInRows(grid: SolverGrid, digit: number): TechniqueResult | null {
	const bit = 1 << (digit - 1);

	// Check all pairs of rows
	for (let row1 = 0; row1 < 9; row1++) {
		for (let row2 = row1 + 1; row2 < 9; row2++) {
			// Find columns where this digit appears in these rows
			const row1Cols: number[] = [];
			const row2Cols: number[] = [];

			// Check row1
			for (let col = 0; col < 9; col++) {
				const idx = row1 * 9 + col;
				if (grid.getValue(idx) === digit) {
					// Digit already placed, can't form X-Wing
					row1Cols.length = 0;
					break;
				}
				if (grid.getCandidates(idx) & bit) {
					row1Cols.push(col);
				}
			}

			// Check row2
			for (let col = 0; col < 9; col++) {
				const idx = row2 * 9 + col;
				if (grid.getValue(idx) === digit) {
					// Digit already placed, can't form X-Wing
					row2Cols.length = 0;
					break;
				}
				if (grid.getCandidates(idx) & bit) {
					row2Cols.push(col);
				}
			}

			// X-Wing requires exactly 2 occurrences in each row
			if (row1Cols.length !== 2 || row2Cols.length !== 2) {
				continue;
			}

			// Check if the columns match (X-Wing pattern)
			const cols1Set = new Set(row1Cols);
			const cols2Set = new Set(row2Cols);

			// Check if both rows have candidates in the same two columns
			if (cols1Set.size === 2 && cols2Set.size === 2) {
				const intersection = row1Cols.filter((col) => cols2Set.has(col));
				if (intersection.length === 2) {
					// We have an X-Wing! The digit appears in rows row1 and row2,
					// and only in columns intersection[0] and intersection[1]
					const col1 = intersection[0]!;
					const col2 = intersection[1]!;
					const eliminated: Array<{ index: number; digit: number }> = [];

					// Eliminate from other cells in these columns
					for (let row = 0; row < 9; row++) {
						if (row === row1 || row === row2) {
							continue; // Skip the X-Wing rows
						}

						const idx1 = row * 9 + col1;
						const idx2 = row * 9 + col2;

						if (grid.getValue(idx1) === 0 && grid.getCandidates(idx1) & bit) {
							eliminated.push({ index: idx1, digit });
						}
						if (grid.getValue(idx2) === 0 && grid.getCandidates(idx2) & bit) {
							eliminated.push({ index: idx2, digit });
						}
					}

					if (eliminated.length > 0) {
						const xWingCells = [
							row1 * 9 + col1,
							row1 * 9 + col2,
							row2 * 9 + col1,
							row2 * 9 + col2,
						];
						return {
							technique: 'x_wing',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `X-Wing: digit ${digit} appears only in rows ${row1 + 1} and ${row2 + 1} in columns ${col1 + 1} and ${col2 + 1}, eliminating it from other cells in those columns`,
							difficulty: 6,
							affectedCells: [...xWingCells, ...eliminated.map((e) => e.index)],
						};
					}
				}
			}
		}
	}

	return null;
}

function findXWingInColumns(grid: SolverGrid, digit: number): TechniqueResult | null {
	const bit = 1 << (digit - 1);

	// Check all pairs of columns
	for (let col1 = 0; col1 < 9; col1++) {
		for (let col2 = col1 + 1; col2 < 9; col2++) {
			// Find rows where this digit appears in these columns
			const col1Rows: number[] = [];
			const col2Rows: number[] = [];

			// Check col1
			for (let row = 0; row < 9; row++) {
				const idx = row * 9 + col1;
				if (grid.getValue(idx) === digit) {
					// Digit already placed, can't form X-Wing
					col1Rows.length = 0;
					break;
				}
				if (grid.getCandidates(idx) & bit) {
					col1Rows.push(row);
				}
			}

			// Check col2
			for (let row = 0; row < 9; row++) {
				const idx = row * 9 + col2;
				if (grid.getValue(idx) === digit) {
					// Digit already placed, can't form X-Wing
					col2Rows.length = 0;
					break;
				}
				if (grid.getCandidates(idx) & bit) {
					col2Rows.push(row);
				}
			}

			// X-Wing requires exactly 2 occurrences in each column
			if (col1Rows.length !== 2 || col2Rows.length !== 2) {
				continue;
			}

			// Check if the rows match (X-Wing pattern)
			const rows1Set = new Set(col1Rows);
			const rows2Set = new Set(col2Rows);

			// Check if both columns have candidates in the same two rows
			if (rows1Set.size === 2 && rows2Set.size === 2) {
				const intersection = col1Rows.filter((row) => rows2Set.has(row));
				if (intersection.length === 2) {
					// We have an X-Wing! The digit appears in columns col1 and col2,
					// and only in rows intersection[0] and intersection[1]
					const row1 = intersection[0]!;
					const row2 = intersection[1]!;
					const eliminated: Array<{ index: number; digit: number }> = [];

					// Eliminate from other cells in these rows
					for (let col = 0; col < 9; col++) {
						if (col === col1 || col === col2) {
							continue; // Skip the X-Wing columns
						}

						const idx1 = row1 * 9 + col;
						const idx2 = row2 * 9 + col;

						if (grid.getValue(idx1) === 0 && grid.getCandidates(idx1) & bit) {
							eliminated.push({ index: idx1, digit });
						}
						if (grid.getValue(idx2) === 0 && grid.getCandidates(idx2) & bit) {
							eliminated.push({ index: idx2, digit });
						}
					}

					if (eliminated.length > 0) {
						const xWingCells = [
							row1 * 9 + col1,
							row1 * 9 + col2,
							row2 * 9 + col1,
							row2 * 9 + col2,
						];
						return {
							technique: 'x_wing',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `X-Wing: digit ${digit} appears only in columns ${col1 + 1} and ${col2 + 1} in rows ${row1 + 1} and ${row2 + 1}, eliminating it from other cells in those rows`,
							difficulty: 6,
							affectedCells: [...xWingCells, ...eliminated.map((e) => e.index)],
						};
					}
				}
			}
		}
	}

	return null;
}

/**
 * Naked Quad: Four cells in a unit contain only four candidates among them,
 * allowing elimination of those candidates from other cells in the unit.
 * Difficulty: 6 (Very Hard) - One difficulty harder than Hidden Quad
 */
export function findNakedQuad(grid: SolverGrid): TechniqueResult | null {
	// Check rows, columns, and boxes
	for (let row = 0; row < 9; row++) {
		const result = findNakedQuadInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findNakedQuadInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) return result;
	}

	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findNakedQuadInUnit(
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

function findNakedQuadInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	// Find all empty cells with 2-4 candidates
	const candidateCells: Array<{ index: number; candidates: number }> = [];
	for (const i of indices) {
		if (grid.getValue(i) !== 0) continue;
		const candidates = grid.getCandidates(i);
		const count = popcount(candidates);
		if (count >= 2 && count <= 4) {
			candidateCells.push({ index: i, candidates });
		}
	}

	// Check all combinations of 4 cells
	for (let i = 0; i < candidateCells.length; i++) {
		for (let j = i + 1; j < candidateCells.length; j++) {
			for (let k = j + 1; k < candidateCells.length; k++) {
				for (let l = k + 1; l < candidateCells.length; l++) {
					const cell1 = candidateCells[i]!;
					const cell2 = candidateCells[j]!;
					const cell3 = candidateCells[k]!;
					const cell4 = candidateCells[l]!;

					// Combined candidates of the four cells
					const combinedMask = cell1.candidates | cell2.candidates | cell3.candidates | cell4.candidates;
					const combinedCount = popcount(combinedMask);

					// Must have exactly 4 candidates combined
					if (combinedCount === 4) {
						const eliminated: Array<{ index: number; digit: number }> = [];

						// Eliminate these candidates from other cells in the unit
						for (const idx of indices) {
							if (
								idx === cell1.index ||
								idx === cell2.index ||
								idx === cell3.index ||
								idx === cell4.index
							)
								continue;
							if (grid.getValue(idx) !== 0) continue;

							for (let digit = 1; digit <= 9; digit++) {
								const bit = 1 << (digit - 1);
								if (combinedMask & bit && grid.getCandidates(idx) & bit) {
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
								if (combinedMask & (1 << (d - 1))) digits.push(d);
							}
							return {
								technique: 'naked_quad',
								applied: false,
								eliminatedCandidates: eliminated,
								message: `Naked Quad (${digits.join(',')}) in ${unitName} at ${getCellName(cell1.index)}, ${getCellName(cell2.index)}, ${getCellName(cell3.index)}, ${getCellName(cell4.index)}`,
								difficulty: 6,
								affectedCells: [
									cell1.index,
									cell2.index,
									cell3.index,
									cell4.index,
									...eliminated.map((e) => e.index),
								],
							};
						}
					}
				}
			}
		}
	}

	return null;
}

