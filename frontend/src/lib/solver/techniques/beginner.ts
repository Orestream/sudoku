import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';
import { getCellName } from './utils';

/**
 * Hidden Single: A digit that can only go in one cell within a unit (row, column, or box).
 * Difficulty: 1 (Beginner)
 */
export function findHiddenSingle(grid: SolverGrid): TechniqueResult | null {
	// Check rows
	for (let row = 0; row < 9; row++) {
		const result = findHiddenSingleInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) {
			return result;
		}
	}

	// Check columns
	for (let col = 0; col < 9; col++) {
		const result = findHiddenSingleInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) {
			return result;
		}
	}

	// Check boxes
	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findHiddenSingleInUnit(
				grid,
				SolverGrid.getBoxIndices(br, bc),
				'box',
				br * 3 + bc,
			);
			if (result) {
				return result;
			}
		}
	}

	return null;
}

function findHiddenSingleInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	// For each digit 1-9, check if it appears in only one cell
	for (let digit = 1; digit <= 9; digit++) {
		const bit = 1 << (digit - 1);
		let candidateCells: number[] = [];

		for (const i of indices) {
			if (grid.getValue(i) === digit) {
				// Digit already placed in this unit
				candidateCells = [];
				break;
			}
			if (grid.getCandidates(i) & bit) {
				candidateCells.push(i);
			}
		}

		if (candidateCells.length === 1) {
			const cellIndex = candidateCells[0]!;
			const unitName =
				unitType === 'row'
					? `row ${unitIndex + 1}`
					: unitType === 'col'
						? `column ${unitIndex + 1}`
						: `box ${unitIndex + 1}`;
			return {
				technique: 'hidden_single',
				applied: false,
				solvedCells: [{ index: cellIndex, value: digit }],
				message: `In ${unitName}, digit ${digit} can only go in cell ${getCellName(cellIndex)} (Hidden Single)`,
				difficulty: 1,
				affectedCells: [cellIndex],
			};
		}
	}

	return null;
}

