import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { findHardLinks, getCellName } from '../utils';

/**
 * Swordfish: A candidate appears in exactly three rows (or columns),
 * and those occurrences align in three columns (or rows), allowing elimination
 * of the candidate from other cells in those columns (or rows).
 * Difficulty: 7 (Expert)
 */
export function findSwordfish(grid: SolverGrid): TechniqueResult | null {
	// Check Swordfish in rows (eliminate from columns)
	for (let digit = 1; digit <= 9; digit++) {
		const result = findSwordfishInRows(grid, digit);
		if (result) {
			return result;
		}
	}

	// Check Swordfish in columns (eliminate from rows)
	for (let digit = 1; digit <= 9; digit++) {
		const result = findSwordfishInColumns(grid, digit);
		if (result) {
			return result;
		}
	}

	return null;
}

function findSwordfishInRows(grid: SolverGrid, digit: number): TechniqueResult | null {
	const bit = 1 << (digit - 1);

	// Check all combinations of three rows
	for (let row1 = 0; row1 < 9; row1++) {
		for (let row2 = row1 + 1; row2 < 9; row2++) {
			for (let row3 = row2 + 1; row3 < 9; row3++) {
				// Find columns where this digit appears in these rows
				const row1Cols: number[] = [];
				const row2Cols: number[] = [];
				const row3Cols: number[] = [];

				// Check row1
				for (let col = 0; col < 9; col++) {
					const idx = row1 * 9 + col;
					if (grid.getValue(idx) === digit) {
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
						row2Cols.length = 0;
						break;
					}
					if (grid.getCandidates(idx) & bit) {
						row2Cols.push(col);
					}
				}

				// Check row3
				for (let col = 0; col < 9; col++) {
					const idx = row3 * 9 + col;
					if (grid.getValue(idx) === digit) {
						row3Cols.length = 0;
						break;
					}
					if (grid.getCandidates(idx) & bit) {
						row3Cols.push(col);
					}
				}

				// Swordfish requires 2-3 occurrences in each row
				if (
					row1Cols.length < 2 ||
					row1Cols.length > 3 ||
					row2Cols.length < 2 ||
					row2Cols.length > 3 ||
					row3Cols.length < 2 ||
					row3Cols.length > 3
				) {
					continue;
				}

				// Find the union of all columns
				const allCols = new Set([...row1Cols, ...row2Cols, ...row3Cols]);

				// Swordfish pattern: all three rows must use exactly the same three columns
				if (allCols.size === 3) {
					const cols = Array.from(allCols);
					const col1 = cols[0]!;
					const col2 = cols[1]!;
					const col3 = cols[2]!;

					const eliminated: Array<{ index: number; digit: number }> = [];

					// Eliminate from other cells in these three columns
					for (let row = 0; row < 9; row++) {
						if (row === row1 || row === row2 || row === row3) {
							continue;
						}

						for (const col of [col1, col2, col3]) {
							const idx = row * 9 + col;
							if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
								eliminated.push({ index: idx, digit });
							}
						}
					}

					if (eliminated.length > 0) {
						// Collect all cells that form the Swordfish pattern
						const swordfishCells: number[] = [];
						for (const row of [row1, row2, row3]) {
							for (const col of [col1, col2, col3]) {
								const idx = row * 9 + col;
								if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
									swordfishCells.push(idx);
								}
							}
						}

						return {
							technique: 'swordfish',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `Swordfish: digit ${digit} appears only in rows ${row1 + 1}, ${row2 + 1}, and ${row3 + 1} in columns ${col1 + 1}, ${col2 + 1}, and ${col3 + 1}, eliminating it from other cells in those columns`,
							difficulty: 7,
							affectedCells: [...swordfishCells, ...eliminated.map((e) => e.index)],
						};
					}
				}
			}
		}
	}

	return null;
}

function findSwordfishInColumns(grid: SolverGrid, digit: number): TechniqueResult | null {
	const bit = 1 << (digit - 1);

	// Check all combinations of three columns
	for (let col1 = 0; col1 < 9; col1++) {
		for (let col2 = col1 + 1; col2 < 9; col2++) {
			for (let col3 = col2 + 1; col3 < 9; col3++) {
				// Find rows where this digit appears in these columns
				const col1Rows: number[] = [];
				const col2Rows: number[] = [];
				const col3Rows: number[] = [];

				// Check col1
				for (let row = 0; row < 9; row++) {
					const idx = row * 9 + col1;
					if (grid.getValue(idx) === digit) {
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
						col2Rows.length = 0;
						break;
					}
					if (grid.getCandidates(idx) & bit) {
						col2Rows.push(row);
					}
				}

				// Check col3
				for (let row = 0; row < 9; row++) {
					const idx = row * 9 + col3;
					if (grid.getValue(idx) === digit) {
						col3Rows.length = 0;
						break;
					}
					if (grid.getCandidates(idx) & bit) {
						col3Rows.push(row);
					}
				}

				// Swordfish requires 2-3 occurrences in each column
				if (
					col1Rows.length < 2 ||
					col1Rows.length > 3 ||
					col2Rows.length < 2 ||
					col2Rows.length > 3 ||
					col3Rows.length < 2 ||
					col3Rows.length > 3
				) {
					continue;
				}

				// Find the union of all rows
				const allRows = new Set([...col1Rows, ...col2Rows, ...col3Rows]);

				// Swordfish pattern: all three columns must use exactly the same three rows
				if (allRows.size === 3) {
					const rows = Array.from(allRows);
					const row1 = rows[0]!;
					const row2 = rows[1]!;
					const row3 = rows[2]!;

					const eliminated: Array<{ index: number; digit: number }> = [];

					// Eliminate from other cells in these three rows
					for (let col = 0; col < 9; col++) {
						if (col === col1 || col === col2 || col === col3) {
							continue;
						}

						for (const row of [row1, row2, row3]) {
							const idx = row * 9 + col;
							if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
								eliminated.push({ index: idx, digit });
							}
						}
					}

					if (eliminated.length > 0) {
						// Collect all cells that form the Swordfish pattern
						const swordfishCells: number[] = [];
						for (const row of [row1, row2, row3]) {
							for (const col of [col1, col2, col3]) {
								const idx = row * 9 + col;
								if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
									swordfishCells.push(idx);
								}
							}
						}

						return {
							technique: 'swordfish',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `Swordfish: digit ${digit} appears only in columns ${col1 + 1}, ${col2 + 1}, and ${col3 + 1} in rows ${row1 + 1}, ${row2 + 1}, and ${row3 + 1}, eliminating it from other cells in those rows`,
							difficulty: 7,
							affectedCells: [...swordfishCells, ...eliminated.map((e) => e.index)],
						};
					}
				}
			}
		}
	}

	return null;
}
