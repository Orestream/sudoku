/**
 * Technique application utility.
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';

/**
 * Apply a technique result to the grid.
 */
export function applyTechnique(grid: SolverGrid, result: TechniqueResult): void {
	if (result.solvedCells) {
		for (const cell of result.solvedCells) {
			grid.setValue(cell.index, cell.value);
		}
	}

	if (result.eliminatedCandidates) {
		for (const elim of result.eliminatedCandidates) {
			grid.eliminateCandidate(elim.index, elim.digit);
		}
	}
}
