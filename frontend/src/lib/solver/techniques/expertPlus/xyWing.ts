import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';

/**
 * XY-Wing: Three cells form a pattern where one cell (pivot) shares candidates
 * with two other cells (wings), and the wings share a candidate that can be
 * eliminated from cells that see both wings.
 *
 * Pattern: Pivot has candidates XY, Wing1 has XZ, Wing2 has YZ.
 * The pivot shares X with Wing1 and Y with Wing2.
 * Any cell that sees both Wing1 and Wing2 can have Z eliminated.
 *
 * Difficulty: 8 (Expert+)
 */
export function findXYWing(grid: SolverGrid): TechniqueResult | null {
	// Find all cells with exactly 2 candidates (bivalue cells)
	const bivalueCells: Array<{ index: number; mask: number; digits: number[] }> = [];

	for (let idx = 0; idx < 81; idx++) {
		if (grid.getValue(idx) !== 0) continue;

		const mask = grid.getCandidates(idx);
		if (popcount(mask) === 2) {
			const digits: number[] = [];
			for (let d = 1; d <= 9; d++) {
				if (mask & (1 << (d - 1))) {
					digits.push(d);
				}
			}
			bivalueCells.push({ index: idx, mask, digits });
		}
	}

	// Need at least 3 bivalue cells for XY-Wing
	if (bivalueCells.length < 3) return null;

	// Try each bivalue cell as the pivot
	for (const pivot of bivalueCells) {
		const [x, y] = pivot.digits;
		if (!x || !y) continue;

		const pivotRow = Math.floor(pivot.index / 9);
		const pivotCol = pivot.index % 9;
		const pivotBox = Math.floor(pivotRow / 3) * 3 + Math.floor(pivotCol / 3);

		// Find potential wings that can "see" the pivot
		const potentialWings = bivalueCells.filter((cell) => {
			if (cell.index === pivot.index) return false;

			const cellRow = Math.floor(cell.index / 9);
			const cellCol = cell.index % 9;
			const cellBox = Math.floor(cellRow / 3) * 3 + Math.floor(cellCol / 3);

			// Must see the pivot
			return cellRow === pivotRow || cellCol === pivotCol || cellBox === pivotBox;
		});

		// Try pairs of potential wings
		for (let i = 0; i < potentialWings.length; i++) {
			const wing1 = potentialWings[i];
			if (!wing1) continue;

			const [a1, b1] = wing1.digits;
			if (!a1 || !b1) continue;

			// Wing1 must share exactly one candidate with pivot
			// Check if wing1 has pattern XZ (shares X with pivot)
			let sharedWithPivot1: number | null = null;
			let uniqueToWing1: number | null = null;

			if (a1 === x || a1 === y) {
				sharedWithPivot1 = a1;
				uniqueToWing1 = b1;
			} else if (b1 === x || b1 === y) {
				sharedWithPivot1 = b1;
				uniqueToWing1 = a1;
			} else {
				continue; // Wing1 doesn't share any candidate with pivot
			}

			for (let j = i + 1; j < potentialWings.length; j++) {
				const wing2 = potentialWings[j];
				if (!wing2) continue;

				const [a2, b2] = wing2.digits;
				if (!a2 || !b2) continue;

				// Wing2 must share the OTHER candidate with pivot
				let sharedWithPivot2: number | null = null;
				let uniqueToWing2: number | null = null;

				if (a2 === x || a2 === y) {
					sharedWithPivot2 = a2;
					uniqueToWing2 = b2;
				} else if (b2 === x || b2 === y) {
					sharedWithPivot2 = b2;
					uniqueToWing2 = a2;
				} else {
					continue; // Wing2 doesn't share any candidate with pivot
				}

				// Wings must share different candidates with pivot
				if (sharedWithPivot1 === sharedWithPivot2) continue;

				// Wings must share the same unique candidate (Z)
				if (uniqueToWing1 !== uniqueToWing2) continue;

				const z = uniqueToWing1;
				const zBit = 1 << (z - 1);

				// Now we have a valid XY-Wing pattern
				// Find cells that see both wings and eliminate Z from them
				const wing1Row = Math.floor(wing1.index / 9);
				const wing1Col = wing1.index % 9;
				const wing1Box = Math.floor(wing1Row / 3) * 3 + Math.floor(wing1Col / 3);

				const wing2Row = Math.floor(wing2.index / 9);
				const wing2Col = wing2.index % 9;
				const wing2Box = Math.floor(wing2Row / 3) * 3 + Math.floor(wing2Col / 3);

				const eliminated: Array<{ index: number; digit: number }> = [];

				for (let idx = 0; idx < 81; idx++) {
					if (grid.getValue(idx) !== 0) continue;
					if (!(grid.getCandidates(idx) & zBit)) continue;

					// Skip the XY-Wing cells themselves
					if (idx === pivot.index || idx === wing1.index || idx === wing2.index) continue;

					const row = Math.floor(idx / 9);
					const col = idx % 9;
					const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

					// Check if sees wing1
					const seesWing1 = row === wing1Row || col === wing1Col || box === wing1Box;
					if (!seesWing1) continue;

					// Check if sees wing2
					const seesWing2 = row === wing2Row || col === wing2Col || box === wing2Box;
					if (!seesWing2) continue;

					eliminated.push({ index: idx, digit: z });
				}

				if (eliminated.length > 0) {
					return {
						technique: 'xy_wing',
						applied: false,
						eliminatedCandidates: eliminated,
						message: `XY-Wing: pivot ${getCellName(pivot.index)} (${x}${y}) with wings ${getCellName(wing1.index)} (${sharedWithPivot1}${z}) and ${getCellName(wing2.index)} (${sharedWithPivot2}${z}), eliminating ${z} from cells seeing both wings`,
						difficulty: 8,
						affectedCells: [
							pivot.index,
							wing1.index,
							wing2.index,
							...eliminated.map((e) => e.index),
						],
					};
				}
			}
		}
	}

	return null;
}
