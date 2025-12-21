import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
/**
 * Jellyfish: A candidate appears in exactly four rows (or columns),
 * and those occurrences align in four columns (or rows), allowing elimination
 * of the candidate from other cells in those columns (or rows).
 * Difficulty: 7 (Expert)
 */
export function findJellyfish(grid: SolverGrid): TechniqueResult | null {
	// Check Jellyfish in rows (eliminate from columns)
	for (let digit = 1; digit <= 9; digit++) {
		const result = findJellyfishInRows(grid, digit);
		if (result) {
			return result;
		}
	}

	// Check Jellyfish in columns (eliminate from rows)
	for (let digit = 1; digit <= 9; digit++) {
		const result = findJellyfishInColumns(grid, digit);
		if (result) {
			return result;
		}
	}

	return null;
}

function findJellyfishInRows(grid: SolverGrid, digit: number): TechniqueResult | null {
	const bit = 1 << (digit - 1);

	// Check all combinations of four rows
	for (let row1 = 0; row1 < 9; row1++) {
		for (let row2 = row1 + 1; row2 < 9; row2++) {
			for (let row3 = row2 + 1; row3 < 9; row3++) {
				for (let row4 = row3 + 1; row4 < 9; row4++) {
					// Find columns where this digit appears in these rows
					const row1Cols: number[] = [];
					const row2Cols: number[] = [];
					const row3Cols: number[] = [];
					const row4Cols: number[] = [];

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

					// Check row4
					for (let col = 0; col < 9; col++) {
						const idx = row4 * 9 + col;
						if (grid.getValue(idx) === digit) {
							row4Cols.length = 0;
							break;
						}
						if (grid.getCandidates(idx) & bit) {
							row4Cols.push(col);
						}
					}

					// Jellyfish requires 2-4 occurrences in each row
					if (
						row1Cols.length < 2 ||
						row1Cols.length > 4 ||
						row2Cols.length < 2 ||
						row2Cols.length > 4 ||
						row3Cols.length < 2 ||
						row3Cols.length > 4 ||
						row4Cols.length < 2 ||
						row4Cols.length > 4
					) {
						continue;
					}

					// Find the union of all columns
					const allCols = new Set([...row1Cols, ...row2Cols, ...row3Cols, ...row4Cols]);

					// Jellyfish pattern: all four rows must use exactly the same four columns
					if (allCols.size === 4) {
						const cols = Array.from(allCols);
						const col1 = cols[0]!;
						const col2 = cols[1]!;
						const col3 = cols[2]!;
						const col4 = cols[3]!;

						const eliminated: Array<{ index: number; digit: number }> = [];

						// Eliminate from other cells in these four columns
						for (let row = 0; row < 9; row++) {
							if (row === row1 || row === row2 || row === row3 || row === row4) {
								continue;
							}

							for (const col of [col1, col2, col3, col4]) {
								const idx = row * 9 + col;
								if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
									eliminated.push({ index: idx, digit });
								}
							}
						}

						if (eliminated.length > 0) {
							// Collect all cells that form the Jellyfish pattern
							const jellyfishCells: number[] = [];
							for (const row of [row1, row2, row3, row4]) {
								for (const col of [col1, col2, col3, col4]) {
									const idx = row * 9 + col;
									if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
										jellyfishCells.push(idx);
									}
								}
							}

							return {
								technique: 'jellyfish',
								applied: false,
								eliminatedCandidates: eliminated,
								message: `Jellyfish: digit ${digit} appears only in rows ${row1 + 1}, ${row2 + 1}, ${row3 + 1}, and ${row4 + 1} in columns ${col1 + 1}, ${col2 + 1}, ${col3 + 1}, and ${col4 + 1}, eliminating it from other cells in those columns`,
								difficulty: 7,
								affectedCells: [...jellyfishCells, ...eliminated.map((e) => e.index)],
							};
						}
					}
				}
			}
		}
	}

	return null;
}

function findJellyfishInColumns(grid: SolverGrid, digit: number): TechniqueResult | null {
	const bit = 1 << (digit - 1);

	// Check all combinations of four columns
	for (let col1 = 0; col1 < 9; col1++) {
		for (let col2 = col1 + 1; col2 < 9; col2++) {
			for (let col3 = col2 + 1; col3 < 9; col3++) {
				for (let col4 = col3 + 1; col4 < 9; col4++) {
					// Find rows where this digit appears in these columns
					const col1Rows: number[] = [];
					const col2Rows: number[] = [];
					const col3Rows: number[] = [];
					const col4Rows: number[] = [];

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

					// Check col4
					for (let row = 0; row < 9; row++) {
						const idx = row * 9 + col4;
						if (grid.getValue(idx) === digit) {
							col4Rows.length = 0;
							break;
						}
						if (grid.getCandidates(idx) & bit) {
							col4Rows.push(row);
						}
					}

					// Jellyfish requires 2-4 occurrences in each column
					if (
						col1Rows.length < 2 ||
						col1Rows.length > 4 ||
						col2Rows.length < 2 ||
						col2Rows.length > 4 ||
						col3Rows.length < 2 ||
						col3Rows.length > 4 ||
						col4Rows.length < 2 ||
						col4Rows.length > 4
					) {
						continue;
					}

					// Find the union of all rows
					const allRows = new Set([...col1Rows, ...col2Rows, ...col3Rows, ...col4Rows]);

					// Jellyfish pattern: all four columns must use exactly the same four rows
					if (allRows.size === 4) {
						const rows = Array.from(allRows);
						const row1 = rows[0]!;
						const row2 = rows[1]!;
						const row3 = rows[2]!;
						const row4 = rows[3]!;

						const eliminated: Array<{ index: number; digit: number }> = [];

						// Eliminate from other cells in these four rows
						for (let col = 0; col < 9; col++) {
							if (col === col1 || col === col2 || col === col3 || col === col4) {
								continue;
							}

							for (const row of [row1, row2, row3, row4]) {
								const idx = row * 9 + col;
								if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
									eliminated.push({ index: idx, digit });
								}
							}
						}

						if (eliminated.length > 0) {
							// Collect all cells that form the Jellyfish pattern
							const jellyfishCells: number[] = [];
							for (const row of [row1, row2, row3, row4]) {
								for (const col of [col1, col2, col3, col4]) {
									const idx = row * 9 + col;
									if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
										jellyfishCells.push(idx);
									}
								}
							}

							return {
								technique: 'jellyfish',
								applied: false,
								eliminatedCandidates: eliminated,
								message: `Jellyfish: digit ${digit} appears only in columns ${col1 + 1}, ${col2 + 1}, ${col3 + 1}, and ${col4 + 1} in rows ${row1 + 1}, ${row2 + 1}, ${row3 + 1}, and ${row4 + 1}, eliminating it from other cells in those rows`,
								difficulty: 7,
								affectedCells: [...jellyfishCells, ...eliminated.map((e) => e.index)],
							};
						}
					}
				}
			}
		}
	}

	return null;
}
