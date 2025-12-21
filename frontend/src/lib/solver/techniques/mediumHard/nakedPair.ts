/**
 * Naked Pair: Two cells in a unit contain the same two candidates,
 * allowing elimination of those candidates from other cells in the unit.
 * Difficulty: 4 (Medium-Hard)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';

export function findNakedPair(grid: SolverGrid): TechniqueResult | null {
	for (let row = 0; row < 9; row++) {
		const result = findNakedPairInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findNakedPairInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) return result;
	}

	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findNakedPairInUnit(
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

function findNakedPairInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	const cellsWithTwoCandidates: Array<{ index: number; candidates: number }> = [];
	for (const i of indices) {
		if (grid.getValue(i) !== 0) continue;
		const candidates = grid.getCandidates(i);
		const count = popcount(candidates);
		if (count === 2) {
			cellsWithTwoCandidates.push({ index: i, candidates });
		}
	}

	for (let i = 0; i < cellsWithTwoCandidates.length; i++) {
		for (let j = i + 1; j < cellsWithTwoCandidates.length; j++) {
			const cell1 = cellsWithTwoCandidates[i]!;
			const cell2 = cellsWithTwoCandidates[j]!;

			if (cell1.candidates === cell2.candidates) {
				const eliminated: Array<{ index: number; digit: number }> = [];
				const pairMask = cell1.candidates;

				for (const idx of indices) {
					if (idx === cell1.index || idx === cell2.index) continue;
					if (grid.getValue(idx) !== 0) continue;

					for (let digit = 1; digit <= 9; digit++) {
						const bit = 1 << (digit - 1);
						if (pairMask & bit && grid.getCandidates(idx) & bit) {
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
						if (pairMask & (1 << (d - 1))) digits.push(d);
					}
					return {
						technique: 'naked_pair',
						applied: false,
						eliminatedCandidates: eliminated,
						message: `Naked Pair (${digits.join(',')}) in ${unitName} at ${getCellName(cell1.index)} and ${getCellName(cell2.index)}`,
						difficulty: 4,
						affectedCells: [
							cell1.index,
							cell2.index,
							...eliminated.map((e) => e.index),
						],
					};
				}
			}
		}
	}

	return null;
}
