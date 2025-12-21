/**
 * Hidden Pair: Two candidates appear only in two cells within a unit,
 * allowing elimination of other candidates from those cells.
 * Difficulty: 3 (Medium)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { getCellName } from '../utils';

export function findHiddenPair(grid: SolverGrid): TechniqueResult | null {
	// Check rows, columns, and boxes
	for (let row = 0; row < 9; row++) {
		const result = findHiddenPairInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findHiddenPairInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) return result;
	}

	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findHiddenPairInUnit(
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

function findHiddenPairInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	// For each pair of digits, check if they appear only in two cells
	for (let d1 = 1; d1 <= 9; d1++) {
		for (let d2 = d1 + 1; d2 <= 9; d2++) {
			const bit1 = 1 << (d1 - 1);
			const bit2 = 1 << (d2 - 1);
			const pairMask = bit1 | bit2;
			const candidateCells: number[] = [];

			// Check if digits are already placed
			let alreadyPlaced = false;
			for (const i of indices) {
				if (grid.getValue(i) === d1 || grid.getValue(i) === d2) {
					alreadyPlaced = true;
					break;
				}
			}
			if (alreadyPlaced) continue;

			// Find cells that contain at least one of these digits
			for (const i of indices) {
				if (grid.getValue(i) !== 0) continue;
				if (grid.getCandidates(i) & pairMask) {
					candidateCells.push(i);
				}
			}

			// Hidden pair: exactly 2 cells contain these digits
			if (candidateCells.length === 2) {
				const cell1 = candidateCells[0]!;
				const cell2 = candidateCells[1]!;
				const candidates1 = grid.getCandidates(cell1);
				const candidates2 = grid.getCandidates(cell2);

				// Check if both cells have other candidates to eliminate
				const otherCandidates1 = candidates1 & ~pairMask;
				const otherCandidates2 = candidates2 & ~pairMask;

				if (otherCandidates1 || otherCandidates2) {
					const eliminated: Array<{ index: number; digit: number }> = [];

					for (let digit = 1; digit <= 9; digit++) {
						const bit = 1 << (digit - 1);
						if (bit & pairMask) continue; // Skip the pair digits

						if (otherCandidates1 & bit) {
							eliminated.push({ index: cell1, digit });
						}
						if (otherCandidates2 & bit) {
							eliminated.push({ index: cell2, digit });
						}
					}

					if (eliminated.length > 0) {
						const unitName =
							unitType === 'row'
								? `row ${unitIndex + 1}`
								: unitType === 'col'
									? `column ${unitIndex + 1}`
									: `box ${unitIndex + 1}`;
						return {
							technique: 'hidden_pair',
							applied: false,
							eliminatedCandidates: eliminated,
							message: `Hidden Pair (${d1},${d2}) in ${unitName} at ${getCellName(cell1)} and ${getCellName(cell2)}`,
							difficulty: 3,
							affectedCells: [cell1, cell2],
						};
					}
				}
			}
		}
	}

	return null;
}
