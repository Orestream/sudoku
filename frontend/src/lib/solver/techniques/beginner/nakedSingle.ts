/**
 * Naked Single: A cell with only one candidate.
 * Difficulty scales with how solved the related units are:
 * - 1 when it's the last empty in its busiest unit (row/col/box)
 * - 2 when it's the second or third last
 * - 3 otherwise
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { getCellName, getSingleDigit } from '../utils';

export function findNakedSingle(grid: SolverGrid): TechniqueResult | null {
	const countEmpty = (indices: number[]): number =>
		indices.reduce((acc, idx) => (grid.getValue(idx) === 0 ? acc + 1 : acc), 0);

	for (let i = 0; i < 81; i++) {
		if (grid.getValue(i) !== 0) {
			continue;
		}
		const candidates = grid.getCandidates(i);
		const digit = getSingleDigit(candidates);
		if (digit === null) {
			continue;
		}

		const row = Math.floor(i / 9);
		const col = i % 9;
		const boxRow = Math.floor(row / 3);
		const boxCol = Math.floor(col / 3);

		const rowEmpty = countEmpty(SolverGrid.getRowIndices(row));
		const colEmpty = countEmpty(SolverGrid.getColIndices(col));
		const boxEmpty = countEmpty(SolverGrid.getBoxIndices(boxRow, boxCol));
		const maxEmpty = Math.max(rowEmpty, colEmpty, boxEmpty);

		let difficulty = 3;
		if (maxEmpty === 1) {
			difficulty = 1;
		} else if (maxEmpty === 2 || maxEmpty === 3) {
			difficulty = 2;
		}

		return {
			technique: 'naked_single',
			applied: false,
			solvedCells: [{ index: i, value: digit }],
			message: `Cell ${getCellName(i)} can only contain ${digit} (Naked Single)`,
			difficulty,
			affectedCells: [i],
		};
	}
	return null;
}
