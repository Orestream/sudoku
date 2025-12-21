/**
 * X-Cycle: A chain of cells connected by a single candidate using alternating
 * strong and weak links. When the chain forms a cycle, it can force eliminations.
 *
 * Key concepts:
 * - Strong link (conjugate pair): The candidate appears in exactly 2 cells in a unit
 * - Weak link: Two cells that see each other and both contain the candidate
 *
 * Types of X-Cycles:
 * - Nice Loop Rule 1: If a continuous nice loop has an even number of links,
 *   the candidate can be eliminated from any cell that sees two cells with the same color.
 * - Nice Loop Rule 2: If all links are strong (a discontinuous nice loop),
 *   the candidate can be placed in cells at breaking points.
 *
 * Difficulty: 10 (Grandmaster)
 */

import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { getCellName, findHardLinks } from '../utils';

type LinkType = 'strong' | 'weak';

interface ChainLink {
	from: number;
	to: number;
	linkType: LinkType;
}

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
 * Build an adjacency map for strong links.
 * Returns a map where each cell maps to an array of cells it has strong links with.
 */
function buildStrongLinkMap(grid: SolverGrid, digit: number): Map<number, number[]> {
	const hardLinks = findHardLinks(grid, digit);
	const strongMap = new Map<number, number[]>();

	for (const link of hardLinks) {
		if (!strongMap.has(link.cell1)) {
			strongMap.set(link.cell1, []);
		}
		if (!strongMap.has(link.cell2)) {
			strongMap.set(link.cell2, []);
		}
		strongMap.get(link.cell1)!.push(link.cell2);
		strongMap.get(link.cell2)!.push(link.cell1);
	}

	return strongMap;
}

/**
 * Find all cells with the candidate.
 */
function findCellsWithCandidate(grid: SolverGrid, digit: number): number[] {
	const bit = 1 << (digit - 1);
	const cells: number[] = [];

	for (let idx = 0; idx < 81; idx++) {
		if (grid.getValue(idx) === 0 && grid.getCandidates(idx) & bit) {
			cells.push(idx);
		}
	}

	return cells;
}

/**
 * Try to find an X-Cycle for a specific digit.
 * Uses DFS to find alternating chains that form cycles.
 */
function findXCycleForDigit(grid: SolverGrid, digit: number): TechniqueResult | null {
	const bit = 1 << (digit - 1);
	const strongMap = buildStrongLinkMap(grid, digit);
	const candidateCells = findCellsWithCandidate(grid, digit);

	if (candidateCells.length < 3) return null;

	// Try to build chains starting from each cell
	for (const startCell of candidateCells) {
		// Try finding a cycle starting with a strong link
		const result = findCycleFromCell(grid, digit, bit, startCell, strongMap, candidateCells);
		if (result) return result;
	}

	return null;
}

/**
 * Find a cycle starting from the given cell using DFS.
 */
function findCycleFromCell(
	grid: SolverGrid,
	digit: number,
	bit: number,
	startCell: number,
	strongMap: Map<number, number[]>,
	allCells: number[],
): TechniqueResult | null {
	// Path: array of cells visited
	// Links: array of link types used to reach each cell
	interface PathState {
		path: number[];
		links: LinkType[];
	}

	// DFS with alternating links
	// Start with a strong link from startCell
	const strongNeighbors = strongMap.get(startCell) || [];

	for (const firstStep of strongNeighbors) {
		// Start path: startCell --(strong)--> firstStep
		const initialState: PathState = {
			path: [startCell, firstStep],
			links: ['strong'],
		};

		const stack: PathState[] = [initialState];
		const maxDepth = 12; // Limit chain length to avoid performance issues

		while (stack.length > 0) {
			const state = stack.pop()!;
			const currentCell = state.path[state.path.length - 1]!;
			const lastLinkType = state.links[state.links.length - 1]!;

			if (state.path.length > maxDepth) continue;

			// Next link type alternates
			const nextLinkType: LinkType = lastLinkType === 'strong' ? 'weak' : 'strong';

			// Find next cells
			let nextCells: number[] = [];

			if (nextLinkType === 'strong') {
				// Must use a strong link
				nextCells = (strongMap.get(currentCell) || []).filter(
					(c) => !state.path.includes(c) || c === startCell,
				);
			} else {
				// Weak link: any cell that sees current and has the candidate
				// (but is not connected by a strong link to avoid ambiguity)
				nextCells = allCells.filter((c) => {
					if (state.path.includes(c) && c !== startCell) return false;
					if (c === currentCell) return false;
					if (!cellsSeeEachOther(currentCell, c)) return false;
					return true;
				});
			}

			for (const nextCell of nextCells) {
				// Check if we've completed a cycle back to start
				if (nextCell === startCell && state.path.length >= 4) {
					// We have a cycle!
					const cycleLinks = [...state.links, nextLinkType];
					const cyclePath = state.path;

					// Analyze the cycle for eliminations
					const result = analyzeCycle(grid, digit, bit, cyclePath, cycleLinks);
					if (result) return result;
				} else if (nextCell !== startCell) {
					// Continue building the chain
					stack.push({
						path: [...state.path, nextCell],
						links: [...state.links, nextLinkType],
					});
				}
			}
		}
	}

	return null;
}

/**
 * Analyze a completed cycle and find eliminations.
 */
function analyzeCycle(
	grid: SolverGrid,
	digit: number,
	bit: number,
	path: number[],
	links: LinkType[],
): TechniqueResult | null {
	const n = path.length;

	// Count strong and weak links
	const strongCount = links.filter((l) => l === 'strong').length;
	const weakCount = links.filter((l) => l === 'weak').length;

	// Nice Loop Rule 1: Continuous nice loop with all alternating links
	// If it's a proper alternating cycle (same number of strong and weak links),
	// we can eliminate the digit from cells that see two adjacent cells in the cycle
	if (strongCount === weakCount && strongCount >= 2) {
		const eliminated: Array<{ index: number; digit: number }> = [];

		// Find cells that see two consecutive cycle cells connected by a weak link
		for (let i = 0; i < n; i++) {
			const linkType = links[i];
			if (linkType === 'weak') {
				const cellA = path[i]!;
				const cellB = path[(i + 1) % n]!;

				// Find cells that see both cellA and cellB and have the candidate
				for (let idx = 0; idx < 81; idx++) {
					if (path.includes(idx)) continue;
					if (grid.getValue(idx) !== 0) continue;
					if (!(grid.getCandidates(idx) & bit)) continue;

					if (cellsSeeEachOther(idx, cellA) && cellsSeeEachOther(idx, cellB)) {
						eliminated.push({ index: idx, digit });
					}
				}
			}
		}

		if (eliminated.length > 0) {
			const pathStr = path.map((c) => getCellName(c)).join(' → ');
			return {
				technique: 'x_cycle',
				applied: false,
				eliminatedCandidates: eliminated,
				message: `X-Cycle on digit ${digit}: ${pathStr} → ${getCellName(path[0]!)}. Eliminating ${digit} from cells that see both ends of weak links.`,
				difficulty: 10,
				affectedCells: [...path, ...eliminated.map((e) => e.index)],
			};
		}
	}

	// Nice Loop Rule 2: Discontinuous nice loop (starts and ends with strong links at same cell)
	// If first and last links are both strong, the start cell must contain the digit
	// This is a "Type 2" X-Cycle - but it places rather than eliminates
	// For now, focus on elimination rules

	// Alternative: If we have consecutive strong links at a point,
	// we can eliminate the candidate from cells that see the "pivot" cell
	for (let i = 0; i < n; i++) {
		const prevLink = links[(i + n - 1) % n];
		const nextLink = links[i];

		// Two strong links meeting at path[i]
		if (prevLink === 'strong' && nextLink === 'strong') {
			const pivotCell = path[i]!;
			const eliminated: Array<{ index: number; digit: number }> = [];

			// Eliminate from cells that see the pivot (except cycle cells)
			for (let idx = 0; idx < 81; idx++) {
				if (path.includes(idx)) continue;
				if (grid.getValue(idx) !== 0) continue;
				if (!(grid.getCandidates(idx) & bit)) continue;

				if (cellsSeeEachOther(idx, pivotCell)) {
					eliminated.push({ index: idx, digit });
				}
			}

			if (eliminated.length > 0) {
				const pathStr = path.map((c) => getCellName(c)).join(' → ');
				return {
					technique: 'x_cycle',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `X-Cycle (Type 2) on digit ${digit}: ${pathStr} → ${getCellName(path[0]!)}. Two strong links meet at ${getCellName(pivotCell)}, eliminating ${digit} from cells that see it.`,
					difficulty: 10,
					affectedCells: [...path, ...eliminated.map((e) => e.index)],
				};
			}
		}

		// Two weak links meeting at path[i] - the candidate CAN be placed here
		// This is a placement, not elimination, so we handle it differently
		if (prevLink === 'weak' && nextLink === 'weak') {
			const pivotCell = path[i]!;

			// The digit must be in this cell - eliminate all OTHER candidates from this cell
			const otherCandidates = grid.getCandidates(pivotCell) & ~bit;

			if (otherCandidates) {
				const eliminated: Array<{ index: number; digit: number }> = [];

				for (let d = 1; d <= 9; d++) {
					if (otherCandidates & (1 << (d - 1))) {
						eliminated.push({ index: pivotCell, digit: d });
					}
				}

				if (eliminated.length > 0) {
					const pathStr = path.map((c) => getCellName(c)).join(' → ');
					return {
						technique: 'x_cycle',
						applied: false,
						eliminatedCandidates: eliminated,
						message: `X-Cycle (Type 1) on digit ${digit}: ${pathStr} → ${getCellName(path[0]!)}. Two weak links meet at ${getCellName(pivotCell)}, so ${digit} must go there.`,
						difficulty: 10,
						affectedCells: [...path],
					};
				}
			}
		}
	}

	return null;
}

/**
 * X-Cycle: Find elimination patterns using alternating strong/weak link chains.
 */
export function findXCycle(grid: SolverGrid): TechniqueResult | null {
	// Try each digit 1-9
	for (let digit = 1; digit <= 9; digit++) {
		const result = findXCycleForDigit(grid, digit);
		if (result) return result;
	}

	return null;
}
