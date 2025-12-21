/**
 * Cell naming utility functions.
 */

/**
 * Get a human-readable cell name (e.g., "R1C1" for row 1, column 1).
 */
export function getCellName(index: number): string {
	const row = Math.floor(index / 9) + 1;
	const col = (index % 9) + 1;
	return `R${row}C${col}`;
}

/**
 * Get the row, column, and box indices for a cell.
 */
export function getCellPosition(index: number): { row: number; col: number; box: number } {
	const row = Math.floor(index / 9);
	const col = index % 9;
	const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
	return { row, col, box };
}

/**
 * Check if two cells see each other (share row, column, or box).
 */
export function cellsSeeEachOther(idx1: number, idx2: number): boolean {
	const pos1 = getCellPosition(idx1);
	const pos2 = getCellPosition(idx2);
	return pos1.row === pos2.row || pos1.col === pos2.col || pos1.box === pos2.box;
}
