import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';
/**
 * Unique Rectangle Type 2: Four cells forming a rectangle share the same two candidates,
 * and two cells (on one side) have the same extra candidate. That extra candidate can be
 * eliminated from cells that see both of those cells.
 * Difficulty: 9 (Master)
 */
export function findUniqueRectangleType2(grid: SolverGrid): TechniqueResult | null {
	// Look for rectangles with bivalue cells
	for (let r1 = 0; r1 < 9; r1++) {
		for (let c1 = 0; c1 < 9; c1++) {
			const idx1 = r1 * 9 + c1;
			if (grid.getValue(idx1) !== 0) continue;

			const cand1 = grid.getCandidates(idx1);
			// Need exactly 2 candidates for the base cell
			if (popcount(cand1) !== 2) continue;

			// Extract the two digits
			const digits: number[] = [];
			for (let d = 1; d <= 9; d++) {
				if (cand1 & (1 << (d - 1))) {
					digits.push(d);
				}
			}
			const [digit1, digit2] = digits;
			if (!digit1 || !digit2) continue;

			const biValueMask = cand1;

			// Try to form rectangles with other cells
			for (let r2 = r1 + 1; r2 < 9; r2++) {
				for (let c2 = c1 + 1; c2 < 9; c2++) {
					// The four corners of the rectangle
					const idx2 = r1 * 9 + c2; // same row as idx1, different column
					const idx3 = r2 * 9 + c1; // same column as idx1, different row
					const idx4 = r2 * 9 + c2; // diagonal from idx1

					// All cells must be empty
					if (
						grid.getValue(idx2) !== 0 ||
						grid.getValue(idx3) !== 0 ||
						grid.getValue(idx4) !== 0
					) {
						continue;
					}

					// Rectangle must span exactly 2 boxes (not all in same box or spanning 4 boxes)
					const box1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
					const box2 = Math.floor(r1 / 3) * 3 + Math.floor(c2 / 3);
					const box3 = Math.floor(r2 / 3) * 3 + Math.floor(c1 / 3);
					const box4 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);

					const uniqueBoxes = new Set([box1, box2, box3, box4]).size;
					if (uniqueBoxes !== 2 && uniqueBoxes !== 4) continue;

					const cand2 = grid.getCandidates(idx2);
					const cand3 = grid.getCandidates(idx3);
					const cand4 = grid.getCandidates(idx4);

					// All cells must contain at least the two base digits
					if ((cand2 & biValueMask) !== biValueMask) continue;
					if ((cand3 & biValueMask) !== biValueMask) continue;
					if ((cand4 & biValueMask) !== biValueMask) continue;

					const cells = [
						{ idx: idx1, cand: cand1, row: r1, col: c1, box: box1 },
						{ idx: idx2, cand: cand2, row: r1, col: c2, box: box2 },
						{ idx: idx3, cand: cand3, row: r2, col: c1, box: box3 },
						{ idx: idx4, cand: cand4, row: r2, col: c2, box: box4 },
					];

					// Type 2: Exactly two cells have identical extra candidate(s)
					// Find cells with extra candidates
					const cellsWithExtra = cells.filter((c) => popcount(c.cand) > 2);
					const cellsWithExactlyTwo = cells.filter((c) => popcount(c.cand) === 2);

					// Type 2 requires exactly 2 cells with extra candidates, 2 cells with exactly the base pair
					if (cellsWithExtra.length !== 2 || cellsWithExactlyTwo.length !== 2) continue;

					// The two cells with extra candidates must have exactly the same candidates
					if (cellsWithExtra[0]!.cand !== cellsWithExtra[1]!.cand) continue;

					// And they must have exactly ONE extra candidate (so 3 total)
					if (popcount(cellsWithExtra[0]!.cand) !== 3) continue;

					// Find the extra candidate
					const extraCandidateMask = cellsWithExtra[0]!.cand & ~biValueMask;
					let extraDigit = 0;
					for (let d = 1; d <= 9; d++) {
						if (extraCandidateMask & (1 << (d - 1))) {
							extraDigit = d;
							break;
						}
					}
					if (extraDigit === 0) continue;

					// The two cells with extra candidates must share a unit (row, column, or box)
					// so we can eliminate the extra digit from cells that see both of them
					const cell1 = cellsWithExtra[0]!;
					const cell2 = cellsWithExtra[1]!;

					// Find cells that see both cell1 and cell2 and have the extra digit as a candidate
					const eliminations: { index: number; digit: number }[] = [];

					// Check if they share a row
					if (cell1.row === cell2.row) {
						// Eliminate from cells in the same row
						for (let c = 0; c < 9; c++) {
							const cellIdx = cell1.row * 9 + c;
							if (cellIdx === cell1.idx || cellIdx === cell2.idx) continue;
							if (grid.getValue(cellIdx) !== 0) continue;
							if (grid.getCandidates(cellIdx) & (1 << (extraDigit - 1))) {
								eliminations.push({ index: cellIdx, digit: extraDigit });
							}
						}
					}

					// Check if they share a column
					if (cell1.col === cell2.col) {
						// Eliminate from cells in the same column
						for (let r = 0; r < 9; r++) {
							const cellIdx = r * 9 + cell1.col;
							if (cellIdx === cell1.idx || cellIdx === cell2.idx) continue;
							if (grid.getValue(cellIdx) !== 0) continue;
							if (grid.getCandidates(cellIdx) & (1 << (extraDigit - 1))) {
								eliminations.push({ index: cellIdx, digit: extraDigit });
							}
						}
					}

					// Check if they share a box
					if (cell1.box === cell2.box) {
						const boxStartRow = Math.floor(cell1.row / 3) * 3;
						const boxStartCol = Math.floor(cell1.col / 3) * 3;
						for (let r = boxStartRow; r < boxStartRow + 3; r++) {
							for (let c = boxStartCol; c < boxStartCol + 3; c++) {
								const cellIdx = r * 9 + c;
								if (cellIdx === cell1.idx || cellIdx === cell2.idx) continue;
								if (grid.getValue(cellIdx) !== 0) continue;
								// Avoid duplicates (cells might already be in eliminations from row/col)
								if (eliminations.some((e) => e.index === cellIdx)) continue;
								if (grid.getCandidates(cellIdx) & (1 << (extraDigit - 1))) {
									eliminations.push({ index: cellIdx, digit: extraDigit });
								}
							}
						}
					}

					if (eliminations.length > 0) {
						return {
							technique: 'unique_rectangle_type2',
							applied: true,
							eliminatedCandidates: eliminations,
							affectedCells: cells.map((c) => c.idx),
							message: `Unique Rectangle Type 2: Cells ${getCellName(idx1)}, ${getCellName(idx2)}, ${getCellName(idx3)}, ${getCellName(idx4)} form a deadly pattern with candidates ${digit1} and ${digit2}. Cells ${getCellName(cell1.idx)} and ${getCellName(cell2.idx)} both have extra candidate ${extraDigit}. To avoid multiple solutions, ${extraDigit} can be eliminated from cells that see both.`,
							difficulty: 9,
						};
					}
				}
			}
		}
	}

	return null;
}
