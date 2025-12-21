import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';
/**
 * Unique Rectangle Type 1: Four cells forming a rectangle share the same two candidates,
 * and if placing a digit in one cell would force the same digit in the opposite cell,
 * that digit can be eliminated from the rectangle.
 * Difficulty: 9 (Master)
 */
export function findUniqueRectangleType1(grid: SolverGrid): TechniqueResult | null {
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

					// Type 1: One diagonal pair has exactly 2 candidates, the other has extra candidates
					// We need to find which pattern matches
					const cells = [
						{ idx: idx1, cand: cand1, row: r1, col: c1 },
						{ idx: idx2, cand: cand2, row: r1, col: c2 },
						{ idx: idx3, cand: cand3, row: r2, col: c1 },
						{ idx: idx4, cand: cand4, row: r2, col: c2 },
					];

					// Check diagonal pairs: (idx1, idx4) and (idx2, idx3)
					const count1 = popcount(cand1);
					const count2 = popcount(cand2);
					const count3 = popcount(cand3);
					const count4 = popcount(cand4);

					// Type 1: One cell has extra candidates
					const counts = [count1, count2, count3, count4];
					const twoCount = counts.filter((c) => c === 2).length;
					const moreThanTwoCount = counts.filter((c) => c > 2).length;

					if (twoCount === 3 && moreThanTwoCount === 1) {
						// Find the cell with extra candidates
						const cellWithExtra = cells.find((c) => popcount(c.cand) > 2);
						if (!cellWithExtra) continue;

						// Can eliminate the two base digits from this cell
						const eliminations = [];
						for (const digit of digits) {
							if (cellWithExtra.cand & (1 << (digit - 1))) {
								eliminations.push({
									index: cellWithExtra.idx,
									digit,
								});
							}
						}

						if (eliminations.length > 0) {
							return {
								technique: 'unique_rectangle_type1',
								applied: true,
								eliminatedCandidates: eliminations,
								affectedCells: cells.map((c) => c.idx),
								message: `Unique Rectangle Type 1: Cells ${getCellName(idx1)}, ${getCellName(idx2)}, ${getCellName(idx3)}, ${getCellName(idx4)} form a deadly pattern with candidates ${digit1} and ${digit2}. To avoid multiple solutions, these candidates can be eliminated from ${getCellName(cellWithExtra.idx)}.`,
								difficulty: 9,
							};
						}
					}
				}
			}
		}
	}

	return null;
}
