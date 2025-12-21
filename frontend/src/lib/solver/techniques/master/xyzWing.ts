import { SolverGrid } from '../../grid';
import type { TechniqueResult } from '../../types';
import { popcount, getCellName } from '../utils';

/**
 * XYZ-Wing: Similar to XY-Wing, but the pivot cell contains three candidates
 * (X, Y, Z) and the wings contain XZ and YZ. The common candidate Z can be
 * eliminated from cells that see all three cells.
 * Difficulty: 9 (Master)
 */
export function findXYZWing(grid: SolverGrid): TechniqueResult | null {
	// Find all cells with exactly 2 candidates (bivalue cells) for wings
	const bivalueCells: Array<{ index: number; mask: number; digits: number[] }> = [];
	// Find all cells with exactly 3 candidates (trivalue cells) for pivot
	const trivalueCells: Array<{ index: number; mask: number; digits: number[] }> = [];

	for (let idx = 0; idx < 81; idx++) {
		if (grid.getValue(idx) !== 0) continue;

		const mask = grid.getCandidates(idx);
		const count = popcount(mask);

		if (count === 2) {
			const digits: number[] = [];
			for (let d = 1; d <= 9; d++) {
				if (mask & (1 << (d - 1))) {
					digits.push(d);
				}
			}
			bivalueCells.push({ index: idx, mask, digits });
		} else if (count === 3) {
			const digits: number[] = [];
			for (let d = 1; d <= 9; d++) {
				if (mask & (1 << (d - 1))) {
					digits.push(d);
				}
			}
			trivalueCells.push({ index: idx, mask, digits });
		}
	}

	// Need at least 1 trivalue cell (pivot) and 2 bivalue cells (wings)
	if (trivalueCells.length < 1 || bivalueCells.length < 2) return null;

	// Try each trivalue cell as the pivot (XYZ)
	for (const pivot of trivalueCells) {
		const [x, y, z] = pivot.digits;
		if (!x || !y || !z) continue;

		const pivotRow = Math.floor(pivot.index / 9);
		const pivotCol = pivot.index % 9;
		const pivotBox = Math.floor(pivotRow / 3) * 3 + Math.floor(pivotCol / 3);

		// Find potential wings that can "see" the pivot
		const potentialWings = bivalueCells.filter(cell => {
			if (cell.index === pivot.index) return false;

			const cellRow = Math.floor(cell.index / 9);
			const cellCol = cell.index % 9;
			const cellBox = Math.floor(cellRow / 3) * 3 + Math.floor(cellCol / 3);

			// Must see the pivot
			return cellRow === pivotRow || cellCol === pivotCol || cellBox === pivotBox;
		});

		// Try each candidate as Z (the one to eliminate)
		for (const zDigit of pivot.digits) {
			const otherDigits = pivot.digits.filter(d => d !== zDigit);
			const [xDigit, yDigit] = otherDigits;
			if (!xDigit || !yDigit) continue;

			// Find wing1 with candidates XZ
			const wing1Candidates = potentialWings.filter(wing => {
				return wing.digits.includes(xDigit) && wing.digits.includes(zDigit);
			});

			// Find wing2 with candidates YZ
			const wing2Candidates = potentialWings.filter(wing => {
				return wing.digits.includes(yDigit) && wing.digits.includes(zDigit);
			});

			for (const wing1 of wing1Candidates) {
				for (const wing2 of wing2Candidates) {
					if (wing1.index === wing2.index) continue;

					const wing1Row = Math.floor(wing1.index / 9);
					const wing1Col = wing1.index % 9;
					const wing1Box = Math.floor(wing1Row / 3) * 3 + Math.floor(wing1Col / 3);

					const wing2Row = Math.floor(wing2.index / 9);
					const wing2Col = wing2.index % 9;
					const wing2Box = Math.floor(wing2Row / 3) * 3 + Math.floor(wing2Col / 3);

					const zBit = 1 << (zDigit - 1);

					// Find cells that see ALL THREE cells (pivot and both wings) and have Z as candidate
					const eliminated: Array<{ index: number; digit: number }> = [];

					for (let idx = 0; idx < 81; idx++) {
						if (grid.getValue(idx) !== 0) continue;
						if (!(grid.getCandidates(idx) & zBit)) continue;

						// Skip the XYZ-Wing cells themselves
						if (idx === pivot.index || idx === wing1.index || idx === wing2.index) continue;

						const row = Math.floor(idx / 9);
						const col = idx % 9;
						const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

						// Must see pivot
						const seesPivot = row === pivotRow || col === pivotCol || box === pivotBox;
						if (!seesPivot) continue;

						// Must see wing1
						const seesWing1 = row === wing1Row || col === wing1Col || box === wing1Box;
						if (!seesWing1) continue;

						// Must see wing2
						const seesWing2 = row === wing2Row || col === wing2Col || box === wing2Box;
						if (!seesWing2) continue;

						eliminated.push({ index: idx, digit: zDigit });
					}

					if (eliminated.length > 0) {
						return {
							technique: 'xyz_wing',
							applied: true,
							eliminatedCandidates: eliminated,
							message: `XYZ-Wing: pivot ${getCellName(pivot.index)} (${xDigit}${yDigit}${zDigit}) with wings ${getCellName(wing1.index)} (${xDigit}${zDigit}) and ${getCellName(wing2.index)} (${yDigit}${zDigit}), eliminating ${zDigit} from cells seeing all three`,
							difficulty: 9,
							affectedCells: [pivot.index, wing1.index, wing2.index],
						};
					}
				}
			}
		}
	}

	return null;
}
