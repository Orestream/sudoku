import { SolverGrid } from '../grid';
import type { TechniqueResult } from '../types';
import { popcount, getCellName } from './utils';

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

/**
 * Hidden Quad: Four candidates appear only in four cells within a unit,
 * allowing elimination of other candidates from those cells.
 * Difficulty: 5 (Hard)
 */
export function findHiddenQuad(grid: SolverGrid): TechniqueResult | null {
	// Check rows, columns, and boxes
	for (let row = 0; row < 9; row++) {
		const result = findHiddenQuadInUnit(grid, SolverGrid.getRowIndices(row), 'row', row);
		if (result) return result;
	}

	for (let col = 0; col < 9; col++) {
		const result = findHiddenQuadInUnit(grid, SolverGrid.getColIndices(col), 'col', col);
		if (result) return result;
	}

	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const result = findHiddenQuadInUnit(
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

function findHiddenQuadInUnit(
	grid: SolverGrid,
	indices: number[],
	unitType: 'row' | 'col' | 'box',
	unitIndex: number,
): TechniqueResult | null {
	// For each combination of 4 digits, check if they appear only in four cells
	for (let d1 = 1; d1 <= 9; d1++) {
		for (let d2 = d1 + 1; d2 <= 9; d2++) {
			for (let d3 = d2 + 1; d3 <= 9; d3++) {
				for (let d4 = d3 + 1; d4 <= 9; d4++) {
					const bit1 = 1 << (d1 - 1);
					const bit2 = 1 << (d2 - 1);
					const bit3 = 1 << (d3 - 1);
					const bit4 = 1 << (d4 - 1);
					const quadMask = bit1 | bit2 | bit3 | bit4;
					const candidateCells: number[] = [];

					// Check if digits are already placed
					let alreadyPlaced = false;
					for (const i of indices) {
						if (
							grid.getValue(i) === d1 ||
							grid.getValue(i) === d2 ||
							grid.getValue(i) === d3 ||
							grid.getValue(i) === d4
						) {
							alreadyPlaced = true;
							break;
						}
					}
					if (alreadyPlaced) continue;

					// Find cells that contain at least one of these digits
					for (const i of indices) {
						if (grid.getValue(i) !== 0) continue;
						if (grid.getCandidates(i) & quadMask) {
							candidateCells.push(i);
						}
					}

					// Hidden quad: exactly 4 cells contain these digits
					if (candidateCells.length === 4) {
						const cell1 = candidateCells[0]!;
						const cell2 = candidateCells[1]!;
						const cell3 = candidateCells[2]!;
						const cell4 = candidateCells[3]!;
						const candidates1 = grid.getCandidates(cell1);
						const candidates2 = grid.getCandidates(cell2);
						const candidates3 = grid.getCandidates(cell3);
						const candidates4 = grid.getCandidates(cell4);

						// Check if any cell has other candidates to eliminate
						const otherCandidates1 = candidates1 & ~quadMask;
						const otherCandidates2 = candidates2 & ~quadMask;
						const otherCandidates3 = candidates3 & ~quadMask;
						const otherCandidates4 = candidates4 & ~quadMask;

						if (
							otherCandidates1 ||
							otherCandidates2 ||
							otherCandidates3 ||
							otherCandidates4
						) {
							const eliminated: Array<{ index: number; digit: number }> = [];

							for (let digit = 1; digit <= 9; digit++) {
								const bit = 1 << (digit - 1);
								if (bit & quadMask) continue; // Skip the quad digits

								if (otherCandidates1 & bit) {
									eliminated.push({ index: cell1, digit });
								}
								if (otherCandidates2 & bit) {
									eliminated.push({ index: cell2, digit });
								}
								if (otherCandidates3 & bit) {
									eliminated.push({ index: cell3, digit });
								}
								if (otherCandidates4 & bit) {
									eliminated.push({ index: cell4, digit });
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
									technique: 'hidden_quad',
									applied: false,
									eliminatedCandidates: eliminated,
									message: `Hidden Quad (${d1},${d2},${d3},${d4}) in ${unitName} at ${getCellName(cell1)}, ${getCellName(cell2)}, ${getCellName(cell3)}, ${getCellName(cell4)}`,
									difficulty: 5,
									affectedCells: [cell1, cell2, cell3, cell4],
								};
							}
						}
					}
				}
			}
		}
	}

	return null;
}

