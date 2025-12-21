/**
 * Box-Line Reduction: A candidate appears only in one box within a row or column,
 * allowing elimination from the rest of that box.
 * Difficulty: 2 (Easy)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';

export function findBoxLineReduction(grid: SolverGrid): TechniqueResult | null {
    // Check rows
    for (let row = 0; row < 9; row++) {
        const result = findBoxLineReductionInRow(grid, row);
        if (result) {
            return result;
        }
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
        const result = findBoxLineReductionInCol(grid, col);
        if (result) {
            return result;
        }
    }

    return null;
}

function findBoxLineReductionInRow(grid: SolverGrid, row: number): TechniqueResult | null {
    const rowIndices = SolverGrid.getRowIndices(row);

    for (let digit = 1; digit <= 9; digit++) {
        const bit = 1 << (digit - 1);
        const candidateCells: number[] = [];

        // Check if digit is already placed in row
        for (const i of rowIndices) {
            if (grid.getValue(i) === digit) {
                candidateCells.length = 0;
                break;
            }
            if (grid.getCandidates(i) & bit) {
                candidateCells.push(i);
            }
        }

        if (candidateCells.length < 2) {
            continue;
        }

        // Check if all candidates are in the same box
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

            // Eliminate from the rest of the box
            for (const i of boxIndices) {
                if (!rowIndices.includes(i) && grid.getCandidates(i) & bit) {
                    eliminated.push({ index: i, digit });
                }
            }

            if (eliminated.length > 0) {
                return {
                    technique: 'box_line_reduction',
                    applied: false,
                    eliminatedCandidates: eliminated,
                    message: `In row ${row + 1}, digit ${digit} appears only in box ${box + 1}, eliminating it from the rest of the box (Box-Line Reduction)`,
                    difficulty: 2,
                    affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
                };
            }
        }
    }

    return null;
}

function findBoxLineReductionInCol(grid: SolverGrid, col: number): TechniqueResult | null {
    const colIndices = SolverGrid.getColIndices(col);

    for (let digit = 1; digit <= 9; digit++) {
        const bit = 1 << (digit - 1);
        const candidateCells: number[] = [];

        // Check if digit is already placed in column
        for (const i of colIndices) {
            if (grid.getValue(i) === digit) {
                candidateCells.length = 0;
                break;
            }
            if (grid.getCandidates(i) & bit) {
                candidateCells.push(i);
            }
        }

        if (candidateCells.length < 2) {
            continue;
        }

        // Check if all candidates are in the same box
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

            // Eliminate from the rest of the box
            for (const i of boxIndices) {
                if (!colIndices.includes(i) && grid.getCandidates(i) & bit) {
                    eliminated.push({ index: i, digit });
                }
            }

            if (eliminated.length > 0) {
                return {
                    technique: 'box_line_reduction',
                    applied: false,
                    eliminatedCandidates: eliminated,
                    message: `In column ${col + 1}, digit ${digit} appears only in box ${box + 1}, eliminating it from the rest of the box (Box-Line Reduction)`,
                    difficulty: 2,
                    affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
                };
            }
        }
    }

    return null;
}
