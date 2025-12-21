/**
 * Pointing Triple: A candidate appears only in one row or column within a box (with 3 cells),
 * allowing elimination from the rest of that row/column.
 * Difficulty: 4 (Medium-Hard)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';

export function findPointingTriple(grid: SolverGrid): TechniqueResult | null {
	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const boxIndices = SolverGrid.getBoxIndices(br, bc);

			for (let digit = 1; digit <= 9; digit++) {
				const bit = 1 << (digit - 1);
				const candidateCells: number[] = [];

				for (const i of boxIndices) {
					if (grid.getValue(i) === digit) {
						candidateCells.length = 0;
						break;
					}
					if (grid.getCandidates(i) & bit) {
						candidateCells.push(i);
					}
				}

				if (candidateCells.length !== 3) continue;

				const rows = new Set(candidateCells.map((i) => Math.floor(i / 9)));
				if (rows.size === 1) {
					const row = Array.from(rows)[0]!;
					const eliminated: Array<{ index: number; digit: number }> = [];

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

				const cols = new Set(candidateCells.map((i) => i % 9));
				if (cols.size === 1) {
					const col = Array.from(cols)[0]!;
					const eliminated: Array<{ index: number; digit: number }> = [];

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
