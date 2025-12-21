/**
 * Pointing Pair: A candidate appears only in one row or column within a box,
 * allowing elimination from the rest of that row/column.
 * Difficulty: 2 (Easy)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';

export function findPointingPair(grid: SolverGrid): TechniqueResult | null {
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const boxIndices = SolverGrid.getBoxIndices(br, bc);

            // For each digit, check if it appears only in one row or column within the box
            for (let digit = 1; digit <= 9; digit++) {
                const bit = 1 << (digit - 1);
                const candidateCells: number[] = [];

                for (const i of boxIndices) {
                    if (grid.getValue(i) === digit) {
                        // Digit already placed
                        candidateCells.length = 0;
                        break;
                    }
                    if (grid.getCandidates(i) & bit) {
                        candidateCells.push(i);
                    }
                }

                if (candidateCells.length < 2 || candidateCells.length > 3) {
                    continue;
                }

                // Check if all candidates are in the same row
                const rows = new Set(candidateCells.map((i) => Math.floor(i / 9)));
                if (rows.size === 1) {
                    const row = Array.from(rows)[0]!;
                    const eliminated: Array<{ index: number; digit: number }> = [];

                    // Eliminate from the rest of the row
                    for (const i of SolverGrid.getRowIndices(row)) {
                        if (!boxIndices.includes(i) && grid.getCandidates(i) & bit) {
                            eliminated.push({ index: i, digit });
                        }
                    }

                    if (eliminated.length > 0) {
                        return {
                            technique: 'pointing_pair',
                            applied: false,
                            eliminatedCandidates: eliminated,
                            message: `In box ${br * 3 + bc + 1}, digit ${digit} appears only in row ${row + 1}, eliminating it from the rest of the row (Pointing Pair)`,
                            difficulty: 2,
                            affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
                        };
                    }
                }

                // Check if all candidates are in the same column
                const cols = new Set(candidateCells.map((i) => i % 9));
                if (cols.size === 1) {
                    const col = Array.from(cols)[0]!;
                    const eliminated: Array<{ index: number; digit: number }> = [];

                    // Eliminate from the rest of the column
                    for (const i of SolverGrid.getColIndices(col)) {
                        if (!boxIndices.includes(i) && grid.getCandidates(i) & bit) {
                            eliminated.push({ index: i, digit });
                        }
                    }

                    if (eliminated.length > 0) {
                        return {
                            technique: 'pointing_pair',
                            applied: false,
                            eliminatedCandidates: eliminated,
                            message: `In box ${br * 3 + bc + 1}, digit ${digit} appears only in column ${col + 1}, eliminating it from the rest of the column (Pointing Pair)`,
                            difficulty: 2,
                            affectedCells: [...candidateCells, ...eliminated.map((e) => e.index)],
                        };
                    }
                }
            }
        }
    }

    return null;
}
