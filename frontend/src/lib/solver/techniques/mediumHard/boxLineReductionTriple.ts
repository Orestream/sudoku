/**
 * Box-Line Reduction Triple: A candidate appears only in one box within a row or column (with 3 cells),
 * allowing elimination from the rest of that box.
 * Difficulty: 4 (Medium-Hard)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';

export function findBoxLineReductionTriple(grid: SolverGrid): TechniqueResult | null {
	for (let row = 0; row < 9; row++) {
		const result = findBoxLineReductionTripleInRow(grid, row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findBoxLineReductionTripleInCol(grid, col);
		if (result) return result;
	}

	return null;
}

function findBoxLineReductionTripleInRow(grid: SolverGrid, row: number): TechniqueResult | null {
	const rowIndices = SolverGrid.getRowIndices(row);

	for (let digit = 1; digit <= 9; digit++) {
		const bit = 1 << (digit - 1);
		const candidateCells: number[] = [];

		for (const i of rowIndices) {
			if (grid.getValue(i) === digit) {
				candidateCells.length = 0;
				break;
			}
			if (grid.getCandidates(i) & bit) {
				candidateCells.push(i);
			}
		}

		if (candidateCells.length !== 3) continue;

		const boxes = new Set(
			candidateCells.map((i) => {
				const r = Math.floor(i / 9);
				const c = i % 9;
				return Math.floor(r / 3) * 3 + Math.floor(c / 3);
			}),
		);

		if (boxes.size === 1) {
			const box = Array.from(boxes)[0]!;
			const boxRow = Math.floor(box / 3);
			const boxCol = box % 3;
			const boxIndices = SolverGrid.getBoxIndices(boxRow, boxCol);
			const eliminated: Array<{ index: number; digit: number }> = [];

			for (const i of boxIndices) {
				if (!rowIndices.includes(i) && grid.getCandidates(i) & bit) {
					eliminated.push({ index: i, digit });
				}
			}

			if (eliminated.length > 0) {
				return {
					technique: 'box_line_reduction_triple',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `In row ${row + 1}, digit ${digit} appears only in box ${box + 1}, eliminating it from the rest of the box (Box-Line Reduction Triple)`,
					difficulty: 4,
					affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
				};
			}
		}
	}

	return null;
}

function findBoxLineReductionTripleInCol(grid: SolverGrid, col: number): TechniqueResult | null {
	const colIndices = SolverGrid.getColIndices(col);

	for (let digit = 1; digit <= 9; digit++) {
		const bit = 1 << (digit - 1);
		const candidateCells: number[] = [];

		for (const i of colIndices) {
			if (grid.getValue(i) === digit) {
				candidateCells.length = 0;
				break;
			}
			if (grid.getCandidates(i) & bit) {
				candidateCells.push(i);
			}
		}

		if (candidateCells.length !== 3) continue;

		const boxes = new Set(
			candidateCells.map((i) => {
				const r = Math.floor(i / 9);
				const c = i % 9;
				return Math.floor(r / 3) * 3 + Math.floor(c / 3);
			}),
		);

		if (boxes.size === 1) {
			const box = Array.from(boxes)[0]!;
			const boxRow = Math.floor(box / 3);
			const boxCol = box % 3;
			const boxIndices = SolverGrid.getBoxIndices(boxRow, boxCol);
			const eliminated: Array<{ index: number; digit: number }> = [];

			for (const i of boxIndices) {
				if (!colIndices.includes(i) && grid.getCandidates(i) & bit) {
					eliminated.push({ index: i, digit });
				}
			}

			if (eliminated.length > 0) {
				return {
					technique: 'box_line_reduction_triple',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `In column ${col + 1}, digit ${digit} appears only in box ${box + 1}, eliminating it from the rest of the box (Box-Line Reduction Triple)`,
					difficulty: 4,
					affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
				};
			}
		}
	}

	return null;
}
