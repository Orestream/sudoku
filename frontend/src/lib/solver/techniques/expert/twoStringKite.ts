import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { findHardLinks, getCellName } from '../utils';
/**
 * Two-String Kite: A pattern where two hard links (conjugate pairs) in different units
 * form a "kite" shape that allows eliminating a candidate.
 *
 * The pattern consists of:
 * - A hard link in a row (cells A and B)
 * - A hard link in a column (cells C and D)
 * - Cells B and C share the same box
 * - Cell A can "see" cell D (same row, column, or box)
 * - If the digit is in A, then it's not in B, so it's in C, so it's not in D
 * - If the digit is in D, then it's not in C, so it's in B, so it's not in A
 * - Therefore, any cell that can see both A and D can have the digit eliminated
 *
 * Difficulty: 9 (Master)
 */
export function findTwoStringKite(grid: SolverGrid): TechniqueResult | null {
	// Try each digit
	for (let digit = 1; digit <= 9; digit++) {
		const links = findHardLinks(grid, digit);
		const bit = 1 << (digit - 1);

		// We need at least 2 links to form a kite
		if (links.length < 2) continue;

		// Try all pairs of links
		for (let i = 0; i < links.length; i++) {
			const link1 = links[i]!;

			// Link1 should be in a row or column (not box)
			if (link1.unitType === 'box') continue;

			for (let j = i + 1; j < links.length; j++) {
				const link2 = links[j]!;

				// Link2 should be in a different type of unit (row vs col)
				if (link2.unitType === 'box') continue;
				if (link1.unitType === link2.unitType) continue;

				// Try both orientations of the kite
				const result = checkKitePattern(grid, link1, link2, digit, bit);
				if (result) return result;

				const result2 = checkKitePattern(grid, link2, link1, digit, bit);
				if (result2) return result2;
			}
		}
	}

	return null;
}

/**
 * Helper function to check if two links form a valid kite pattern.
 * link1 should be the "base" (row or column), link2 should be the "perpendicular" link.
 */
function checkKitePattern(
	grid: SolverGrid,
	link1: ReturnType<typeof findHardLinks>[0],
	link2: ReturnType<typeof findHardLinks>[0],
	digit: number,
	bit: number,
): TechniqueResult | null {
	// Get cell positions
	const getRow = (idx: number) => Math.floor(idx / 9);
	const getCol = (idx: number) => idx % 9;
	const getBox = (idx: number) => Math.floor(getRow(idx) / 3) * 3 + Math.floor(getCol(idx) / 3);

	// For each combination of cells from the two links
	// We're looking for: A-B in link1, C-D in link2
	// Where B and C share a box, and A can see D

	const cells1 = [link1.cell1, link1.cell2];
	const cells2 = [link2.cell1, link2.cell2];

	for (const [a, b] of [[cells1[0], cells1[1]], [cells1[1], cells1[0]]]) {
		for (const [c, d] of [[cells2[0], cells2[1]], [cells2[1], cells2[0]]]) {
			// Check if B and C share the same box
			if (getBox(b!) !== getBox(c!)) continue;

			// Check if A and D can see each other (but are not the same cell)
			if (a === d) continue;

			const aRow = getRow(a!);
			const aCol = getCol(a!);
			const dRow = getRow(d!);
			const dCol = getCol(d!);
			const aBox = getBox(a!);
			const dBox = getBox(d!);

			const canSee = aRow === dRow || aCol === dCol || aBox === dBox;
			if (!canSee) continue;

			// We have a valid kite pattern!
			// Now find cells that can see both A and D
			const eliminated: Array<{ index: number; digit: number }> = [];

			for (let idx = 0; idx < 81; idx++) {
				// Skip if not empty or doesn't have the candidate
				if (grid.getValue(idx) !== 0) continue;
				if (!(grid.getCandidates(idx) & bit)) continue;

				// Skip if it's one of the kite cells
				if (idx === a || idx === b || idx === c || idx === d) continue;

				const row = getRow(idx);
				const col = getCol(idx);
				const box = getBox(idx);

				// Check if this cell can see A
				const seesA = row === aRow || col === aCol || box === aBox;
				if (!seesA) continue;

				// Check if this cell can see D
				const seesD = row === dRow || col === dCol || box === dBox;
				if (!seesD) continue;

				// This cell sees both ends of the kite, eliminate!
				eliminated.push({ index: idx, digit });
			}

			if (eliminated.length > 0) {
				const link1Name = link1.unitType === 'row'
					? `row ${link1.unitIndex + 1}`
					: `column ${link1.unitIndex + 1}`;
				const link2Name = link2.unitType === 'row'
					? `row ${link2.unitIndex + 1}`
					: `column ${link2.unitIndex + 1}`;

				return {
					technique: 'two_string_kite',
					applied: false,
					eliminatedCandidates: eliminated,
					message: `Two-String Kite: digit ${digit} forms a kite pattern in ${link1Name} (${getCellName(a!)}-${getCellName(b!)}) and ${link2Name} (${getCellName(c!)}-${getCellName(d!)}), eliminating candidates that see both ${getCellName(a!)} and ${getCellName(d!)}`,
					difficulty: 9,
					affectedCells: [a!, b!, c!, d!, ...eliminated.map((e) => e.index)],
				};
			}
		}
	}

	return null;
}
