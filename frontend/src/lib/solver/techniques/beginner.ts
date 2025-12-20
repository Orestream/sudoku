import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';
import { getCellName, getSingleDigit } from './utils';

/**
 * Naked Single: A cell with only one candidate.
 * Difficulty scales with how solved the related units are:
 * - 1 when it's the last empty in its busiest unit (row/col/box)
 * - 2 when it's the second or third last
 * - 3 otherwise
 */
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

/**
 * Hidden Single: A digit that can only go in one cell within a unit (row, column, or box).
 * Difficulty: 1 (Beginner)
 */
export function findHiddenSingle(grid: SolverGrid): TechniqueResult | null {
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
			// Treat row/column hidden singles as slightly harder to spot than box ones.
			const difficulty = unitType === 'box' ? 1 : 3;
			return {
				technique: 'hidden_single',
				applied: false,
				solvedCells: [{ index: cellIndex, value: digit }],
				message: `In ${unitName}, digit ${digit} can only go in cell ${getCellName(cellIndex)} (Hidden Single)`,
				difficulty,
				affectedCells: [cellIndex],
			};
		}
	}

	return null;
}
