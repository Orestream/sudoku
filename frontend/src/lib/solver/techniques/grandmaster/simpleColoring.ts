/**
 * Simple Coloring: A technique that uses alternating colors on conjugate pairs
 * (strong links) for a single digit. By coloring cells in chains with two colors,
 * we can identify contradictions and make eliminations.
 *
 * Key concepts:
 * - Color cells connected by strong links with alternating colors (A and B)
 * - Rule 1 (Color Trap): If an uncolored cell sees cells of BOTH colors,
 *   the candidate can be eliminated from that cell (one color must be true,
 *   so the seeing cell can't have the digit)
 * - Rule 2 (Color Wrap): If two cells of the SAME color see each other,
 *   that color is false, so the OTHER color must be true everywhere
 *
 * Difficulty: 10 (Grandmaster)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { getCellName, findHardLinks } from '../utils';

type Color = 'A' | 'B';

/**
 * Check if two cells see each other (share row, column, or box).
 */
function cellsSeeEachOther(idx1: number, idx2: number): boolean {
    const row1 = Math.floor(idx1 / 9);
    const col1 = idx1 % 9;
    const box1 = Math.floor(row1 / 3) * 3 + Math.floor(col1 / 3);

    const row2 = Math.floor(idx2 / 9);
    const col2 = idx2 % 9;
    const box2 = Math.floor(row2 / 3) * 3 + Math.floor(col2 / 3);

    return row1 === row2 || col1 === col2 || box1 === box2;
}

/**
 * Build connected components of cells using strong links.
 * Returns an array of components, where each component is a Map of cell -> color.
 */
function buildColoredComponents(
    grid: SolverGrid,
    digit: number,
): Map<number, Color>[] {
    const hardLinks = findHardLinks(grid, digit);

    if (hardLinks.length === 0) return [];

    // Build adjacency list from hard links
    const adjacency = new Map<number, Set<number>>();

    for (const link of hardLinks) {
        if (!adjacency.has(link.cell1)) {
            adjacency.set(link.cell1, new Set());
        }
        if (!adjacency.has(link.cell2)) {
            adjacency.set(link.cell2, new Set());
        }
        adjacency.get(link.cell1)!.add(link.cell2);
        adjacency.get(link.cell2)!.add(link.cell1);
    }

    const allCells = Array.from(adjacency.keys());
    const visited = new Set<number>();
    const components: Map<number, Color>[] = [];

    // BFS to color each connected component
    for (const startCell of allCells) {
        if (visited.has(startCell)) continue;

        const component = new Map<number, Color>();
        const queue: Array<{ cell: number; color: Color }> = [{ cell: startCell, color: 'A' }];

        while (queue.length > 0) {
            const { cell, color } = queue.shift()!;

            if (visited.has(cell)) continue;
            visited.add(cell);
            component.set(cell, color);

            const neighbors = adjacency.get(cell) || new Set();
            const nextColor: Color = color === 'A' ? 'B' : 'A';

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    queue.push({ cell: neighbor, color: nextColor });
                }
            }
        }

        if (component.size >= 2) {
            components.push(component);
        }
    }

    return components;
}

/**
 * Find cells with the candidate that are not in any colored component.
 */
function findUncoloredCells(
    grid: SolverGrid,
    digit: number,
    coloredCells: Set<number>,
): number[] {
    const bit = 1 << (digit - 1);
    const uncolored: number[] = [];

    for (let idx = 0; idx < 81; idx++) {
        if (grid.getValue(idx) !== 0) continue;
        if (!(grid.getCandidates(idx) & bit)) continue;
        if (coloredCells.has(idx)) continue;

        uncolored.push(idx);
    }

    return uncolored;
}

/**
 * Rule 1 - Color Trap: Find uncolored cells that see both colors.
 * These cells can have the candidate eliminated.
 */
function findColorTrap(
    component: Map<number, Color>,
    uncoloredCells: number[],
    digit: number,
): TechniqueResult | null {
    const colorACells: number[] = [];
    const colorBCells: number[] = [];

    for (const [cell, color] of component) {
        if (color === 'A') {
            colorACells.push(cell);
        } else {
            colorBCells.push(cell);
        }
    }

    const eliminated: Array<{ index: number; digit: number }> = [];

    for (const cell of uncoloredCells) {
        const seesA = colorACells.some((c) => cellsSeeEachOther(cell, c));
        const seesB = colorBCells.some((c) => cellsSeeEachOther(cell, c));

        if (seesA && seesB) {
            eliminated.push({ index: cell, digit });
        }
    }

    if (eliminated.length > 0) {
        const colorAStr = colorACells.map((c) => getCellName(c)).join(', ');
        const colorBStr = colorBCells.map((c) => getCellName(c)).join(', ');

        return {
            technique: 'simple_coloring',
            applied: false,
            eliminatedCandidates: eliminated,
            message: `Simple Coloring (Color Trap) on digit ${digit}: Color A at [${colorAStr}], Color B at [${colorBStr}]. Cells seeing both colors cannot contain ${digit}.`,
            difficulty: 10,
            affectedCells: [...colorACells, ...colorBCells, ...eliminated.map((e) => e.index)],
        };
    }

    return null;
}

/**
 * Rule 2 - Color Wrap: Find two cells of the same color that see each other.
 * This means that color is false, so the other color is true.
 */
function findColorWrap(
    grid: SolverGrid,
    component: Map<number, Color>,
    digit: number,
): TechniqueResult | null {
    const bit = 1 << (digit - 1);
    const colorACells: number[] = [];
    const colorBCells: number[] = [];

    for (const [cell, color] of component) {
        if (color === 'A') {
            colorACells.push(cell);
        } else {
            colorBCells.push(cell);
        }
    }

    // Check if any two cells of color A see each other
    let falseColor: Color | null = null;

    for (let i = 0; i < colorACells.length && !falseColor; i++) {
        for (let j = i + 1; j < colorACells.length; j++) {
            if (cellsSeeEachOther(colorACells[i]!, colorACells[j]!)) {
                falseColor = 'A';
                break;
            }
        }
    }

    // Check if any two cells of color B see each other
    for (let i = 0; i < colorBCells.length && !falseColor; i++) {
        for (let j = i + 1; j < colorBCells.length; j++) {
            if (cellsSeeEachOther(colorBCells[i]!, colorBCells[j]!)) {
                falseColor = 'B';
                break;
            }
        }
    }

    if (falseColor) {
        const falseCells = falseColor === 'A' ? colorACells : colorBCells;
        const trueCells = falseColor === 'A' ? colorBCells : colorACells;
        const trueColor = falseColor === 'A' ? 'B' : 'A';

        // The false color cells can have the candidate eliminated
        const eliminated: Array<{ index: number; digit: number }> = [];

        for (const cell of falseCells) {
            if (grid.getCandidates(cell) & bit) {
                eliminated.push({ index: cell, digit });
            }
        }

        if (eliminated.length > 0) {
            const trueStr = trueCells.map((c) => getCellName(c)).join(', ');
            const falseStr = falseCells.map((c) => getCellName(c)).join(', ');

            return {
                technique: 'simple_coloring',
                applied: false,
                eliminatedCandidates: eliminated,
                message: `Simple Coloring (Color Wrap) on digit ${digit}: Color ${falseColor} at [${falseStr}] has cells that see each other, so Color ${trueColor} at [${trueStr}] must be true. Eliminating ${digit} from Color ${falseColor} cells.`,
                difficulty: 10,
                affectedCells: [...colorACells, ...colorBCells],
            };
        }
    }

    return null;
}

/**
 * Simple Coloring: Find eliminations using conjugate pair coloring.
 */
export function findSimpleColoring(grid: SolverGrid): TechniqueResult | null {
    // Try each digit 1-9
    for (let digit = 1; digit <= 9; digit++) {
        const components = buildColoredComponents(grid, digit);

        if (components.length === 0) continue;

        // Get all colored cells
        const allColoredCells = new Set<number>();
        for (const component of components) {
            for (const cell of component.keys()) {
                allColoredCells.add(cell);
            }
        }

        // Get uncolored cells with this candidate
        const uncoloredCells = findUncoloredCells(grid, digit, allColoredCells);

        // Check each component for eliminations
        for (const component of components) {
            // Rule 2: Color Wrap (check first as it's more powerful)
            const wrapResult = findColorWrap(grid, component, digit);
            if (wrapResult) return wrapResult;

            // Rule 1: Color Trap
            const trapResult = findColorTrap(component, uncoloredCells, digit);
            if (trapResult) return trapResult;
        }
    }

    return null;
}
