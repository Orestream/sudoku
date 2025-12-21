import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';

/**
 * Naked Triple: Three cells in a unit contain only three candidates among them,
 * allowing elimination of those candidates from other cells in the unit.
 * Difficulty: 5 (Hard) - One difficulty harder than Hidden Triple
 */
export function findNakedTriple(grid: SolverGrid): TechniqueResult | null {
	// Check rows, columns, and boxes
	for (let row = 0; row < 9; row++) {
		const result = findNakedTripleInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findNakedTripleInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) return result;
	}

	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findNakedTripleInUnit(
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

function findNakedTripleInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	// Find all empty cells with 2-3 candidates
	const candidateCells: Array<{ index: number; candidates: number }> = [];
	for (const i of indices) {
		if (grid.getValue(i) !== 0) continue;
		const candidates = grid.getCandidates(i);
		const count = popcount(candidates);
		if (count >= 2 && count <= 3) {
			candidateCells.push({ index: i, candidates });
		}
	}

	// Check all combinations of 3 cells
	for (let i = 0; i < candidateCells.length; i++) {
		for (let j = i + 1; j < candidateCells.length; j++) {
			for (let k = j + 1; k < candidateCells.length; k++) {
				const cell1 = candidateCells[i]!;
				const cell2 = candidateCells[j]!;
				const cell3 = candidateCells[k]!;

				// Combined candidates of the three cells
				const combinedMask = cell1.candidates | cell2.candidates | cell3.candidates;
				const combinedCount = popcount(combinedMask);

				// Must have exactly 3 candidates combined
				if (combinedCount === 3) {
					const eliminated: Array<{ index: number; digit: number }> = [];

					// Eliminate these candidates from other cells in the unit
					for (const idx of indices) {
						if (idx === cell1.index || idx === cell2.index || idx === cell3.index)
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
							technique: 'naked_triple',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `Naked Triple (${digits.join(',')}) in ${unitName} at ${getCellName(cell1.index)}, ${getCellName(cell2.index)}, ${getCellName(cell3.index)}`,
							difficulty: 5,
							affectedCells: [cell1.index, cell2.index, cell3.index, ...eliminated.map((e) => e.index)],
						};
					}
				}
			}
		}
	}

	return null;
}
