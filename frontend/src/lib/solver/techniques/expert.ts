import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';
import { findHardLinks, getCellName } from './utils';

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

/**
 * Two-String Kite: A pattern where two hard links (conjugate pairs) in different units
 * form a "kite" shape that allows eliminating a candidate.
 *
 * The pattern consists of:
 * - A hard link in a row (cells A and B)
 * - A hard link in a column (cells C and D)
 * - Cells B and C share the same box
 * - Cell A can "see" cell D (same row, column, or box)
 * - If the digit is in A, then it's not in B, so it's in C, so it's not in D
 * - If the digit is in D, then it's not in C, so it's in B, so it's not in A
 * - Therefore, any cell that can see both A and D can have the digit eliminated
 *
 * Difficulty: 9 (Master)
 */
export function findTwoStringKite(grid: SolverGrid): TechniqueResult | null {
	// Try each digit
	for (let digit = 1; digit <= 9; digit++) {
		const links = findHardLinks(grid, digit);
		const bit = 1 << (digit - 1);

		// We need at least 2 links to form a kite
		if (links.length < 2) continue;

		// Try all pairs of links
		for (let i = 0; i < links.length; i++) {
			const link1 = links[i]!;

			// Link1 should be in a row or column (not box)
			if (link1.unitType === 'box') continue;

			for (let j = i + 1; j < links.length; j++) {
				const link2 = links[j]!;

				// Link2 should be in a different type of unit (row vs col)
				if (link2.unitType === 'box') continue;
				if (link1.unitType === link2.unitType) continue;

				// Try both orientations of the kite
				const result = checkKitePattern(grid, link1, link2, digit, bit);
				if (result) return result;

				const result2 = checkKitePattern(grid, link2, link1, digit, bit);
				if (result2) return result2;
			}
		}
	}

	return null;
}

/**
 * Helper function to check if two links form a valid kite pattern.
 * link1 should be the "base" (row or column), link2 should be the "perpendicular" link.
 */
function checkKitePattern(
	grid: SolverGrid,
	link1: ReturnType<typeof findHardLinks>[0],
	link2: ReturnType<typeof findHardLinks>[0],
	digit: number,
	bit: number,
): TechniqueResult | null {
	// Get cell positions
	const getRow = (idx: number) => Math.floor(idx / 9);
	const getCol = (idx: number) => idx % 9;
	const getBox = (idx: number) => Math.floor(getRow(idx) / 3) * 3 + Math.floor(getCol(idx) / 3);

	// For each combination of cells from the two links
	// We're looking for: A-B in link1, C-D in link2
	// Where B and C share a box, and A can see D

	const cells1 = [link1.cell1, link1.cell2];
	const cells2 = [link2.cell1, link2.cell2];

	for (const [a, b] of [[cells1[0], cells1[1]], [cells1[1], cells1[0]]]) {
		for (const [c, d] of [[cells2[0], cells2[1]], [cells2[1], cells2[0]]]) {
			// Check if B and C share the same box
			if (getBox(b!) !== getBox(c!)) continue;

			// Check if A and D can see each other (but are not the same cell)
			if (a === d) continue;

			const aRow = getRow(a!);
			const aCol = getCol(a!);
			const dRow = getRow(d!);
			const dCol = getCol(d!);
			const aBox = getBox(a!);
			const dBox = getBox(d!);

			const canSee = aRow === dRow || aCol === dCol || aBox === dBox;
			if (!canSee) continue;

			// We have a valid kite pattern!
			// Now find cells that can see both A and D
			const eliminated: Array<{ index: number; digit: number }> = [];

			for (let idx = 0; idx < 81; idx++) {
				// Skip if not empty or doesn't have the candidate
				if (grid.getValue(idx) !== 0) continue;
				if (!(grid.getCandidates(idx) & bit)) continue;

				// Skip if it's one of the kite cells
				if (idx === a || idx === b || idx === c || idx === d) continue;

				const row = getRow(idx);
				const col = getCol(idx);
				const box = getBox(idx);

				// Check if this cell can see A
				const seesA = row === aRow || col === aCol || box === aBox;
				if (!seesA) continue;

				// Check if this cell can see D
				const seesD = row === dRow || col === dCol || box === dBox;
				if (!seesD) continue;

				// This cell sees both ends of the kite, eliminate!
				eliminated.push({ index: idx, digit });
			}

			if (eliminated.length > 0) {
				const link1Name = link1.unitType === 'row'
					? `row ${link1.unitIndex + 1}`
					: `column ${link1.unitIndex + 1}`;
				const link2Name = link2.unitType === 'row'
					? `row ${link2.unitIndex + 1}`
					: `column ${link2.unitIndex + 1}`;

				return {
					technique: 'two_string_kite',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `Two-String Kite: digit ${digit} forms a kite pattern in ${link1Name} (${getCellName(a!)}-${getCellName(b!)}) and ${link2Name} (${getCellName(c!)}-${getCellName(d!)}), eliminating candidates that see both ${getCellName(a!)} and ${getCellName(d!)}`,
					difficulty: 9,
					affectedCells: [a!, b!, c!, d!, ...eliminated.map((e) => e.index)],
				};
			}
		}
	}

	return null;
}
