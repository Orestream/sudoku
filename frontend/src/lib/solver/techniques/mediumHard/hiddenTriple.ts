/**
 * Hidden Triple: Three candidates appear only in three cells within a unit,
 * allowing elimination of other candidates from those cells.
 * Difficulty: 4 (Medium-Hard)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { getCellName } from '../utils';

export function findHiddenTriple(grid: SolverGrid): TechniqueResult | null {
	for (let row = 0; row < 9; row++) {
		const result = findHiddenTripleInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findHiddenTripleInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) return result;
	}

	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findHiddenTripleInUnit(
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

function findHiddenTripleInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	for (let d1 = 1; d1 <= 9; d1++) {
		for (let d2 = d1 + 1; d2 <= 9; d2++) {
			for (let d3 = d2 + 1; d3 <= 9; d3++) {
				const bit1 = 1 << (d1 - 1);
				const bit2 = 1 << (d2 - 1);
				const bit3 = 1 << (d3 - 1);
				const tripleMask = bit1 | bit2 | bit3;
				const candidateCells: number[] = [];

				let alreadyPlaced = false;
				for (const i of indices) {
					if (grid.getValue(i) === d1 || grid.getValue(i) === d2 || grid.getValue(i) === d3) {
						alreadyPlaced = true;
						break;
					}
				}
				if (alreadyPlaced) continue;

				for (const i of indices) {
					if (grid.getValue(i) !== 0) continue;
					if (grid.getCandidates(i) & tripleMask) {
						candidateCells.push(i);
					}
				}

				if (candidateCells.length === 3) {
					const cell1 = candidateCells[0]!;
					const cell2 = candidateCells[1]!;
					const cell3 = candidateCells[2]!;
					const candidates1 = grid.getCandidates(cell1);
					const candidates2 = grid.getCandidates(cell2);
					const candidates3 = grid.getCandidates(cell3);

					const otherCandidates1 = candidates1 & ~tripleMask;
					const otherCandidates2 = candidates2 & ~tripleMask;
					const otherCandidates3 = candidates3 & ~tripleMask;

					if (otherCandidates1 || otherCandidates2 || otherCandidates3) {
						const eliminated: Array<{ index: number; digit: number }> = [];

						for (let digit = 1; digit <= 9; digit++) {
							const bit = 1 << (digit - 1);
							if (bit & tripleMask) continue;

							if (otherCandidates1 & bit) eliminated.push({ index: cell1, digit });
							if (otherCandidates2 & bit) eliminated.push({ index: cell2, digit });
							if (otherCandidates3 & bit) eliminated.push({ index: cell3, digit });
						}

						if (eliminated.length > 0) {
							const unitName =
								unitType === 'row'
									? `row ${unitIndex + 1}`
									: unitType === 'col'
										? `column ${unitIndex + 1}`
										: `box ${unitIndex + 1}`;
							return {
								technique: 'hidden_triple',
								applied: false,
								eliminatedCandidates: eliminated,
								message: `Hidden Triple (${d1},${d2},${d3}) in ${unitName} at ${getCellName(cell1)}, ${getCellName(cell2)}, ${getCellName(cell3)}`,
								difficulty: 4,
								affectedCells: [cell1, cell2, cell3],
							};
						}
					}
				}
			}
		}
	}

	return null;
}
