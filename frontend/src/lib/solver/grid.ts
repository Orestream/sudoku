import type { Grid } from '../sudoku';

const FULL_MASK = (1 << 9) - 1; // 0b111111111 - all 9 digits possible

export class SolverGrid {
	private values: Grid;
	private candidates: number[]; // Bitmask per cell: bit 0 = digit 1, bit 8 = digit 9
	private givens: Grid;

	constructor(values: Grid, givens?: Grid) {
		if (values.length !== 81) {
			throw new Error('Grid must have 81 cells');
		}
		this.values = [...values];
		this.givens = givens ? [...givens] : [...values];
		this.candidates = Array.from({ length: 81 }, () => 0);

		// Initialize candidates based on current values
		this.recalculateCandidates();
	}

	/**
	 * Recalculate all candidates based on current values.
	 */
	private recalculateCandidates(): void {
		// Build masks for rows, columns, and boxes
		const rowMask = Array.from({ length: 9 }, () => 0);
		const colMask = Array.from({ length: 9 }, () => 0);
		const boxMask = Array.from({ length: 9 }, () => 0);

		for (let i = 0; i < 81; i++) {
			const v = this.values[i];
			if (v >= 1 && v <= 9) {
				const r = Math.floor(i / 9);
				const c = i % 9;
				const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
				const bit = 1 << (v - 1);
				rowMask[r] |= bit;
				colMask[c] |= bit;
				boxMask[b] |= bit;
			}
		}

		// Set candidates for empty cells
		for (let i = 0; i < 81; i++) {
			if (this.values[i] !== 0) {
				this.candidates[i] = 0;
				continue;
			}
			const r = Math.floor(i / 9);
			const c = i % 9;
			const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
			const used = rowMask[r] | colMask[c] | boxMask[b];
			this.candidates[i] = FULL_MASK & ~used;
		}
	}

	/**
	 * Get the value at a cell index.
	 */
	getValue(index: number): number {
		return this.values[index] ?? 0;
	}

	/**
	 * Set a value at a cell index and update candidates.
	 */
	setValue(index: number, value: number): void {
		if (this.givens[index] !== 0) {
			throw new Error('Cannot set value on a given cell');
		}
		if (value < 0 || value > 9) {
			throw new Error('Value must be between 0 and 9');
		}

		this.values[index] = value;

		// If setting a value, clear candidates and eliminate from peers
		if (value !== 0) {
			this.candidates[index] = 0;
			this.eliminateFromPeers(index, value);
		} else {
			// If clearing, recalculate candidates
			this.recalculateCandidates();
		}
	}

	/**
	 * Eliminate a candidate digit from a cell.
	 */
	eliminateCandidate(index: number, digit: number): boolean {
		if (digit < 1 || digit > 9) {
			return false;
		}
		if (this.values[index] !== 0) {
			return false; // Cell already has a value
		}

		const bit = 1 << (digit - 1);
		if (this.candidates[index] & bit) {
			this.candidates[index] &= ~bit;
			return true;
		}
		return false;
	}

	/**
	 * Get candidates for a cell as a bitmask.
	 */
	getCandidates(index: number): number {
		return this.candidates[index] ?? 0;
	}

	/**
	 * Get candidates for a cell as an array of digits.
	 */
	getCandidatesArray(index: number): number[] {
		const mask = this.getCandidates(index);
		const digits: number[] = [];
		for (let d = 1; d <= 9; d++) {
			if (mask & (1 << (d - 1))) {
				digits.push(d);
			}
		}
		return digits;
	}

	/**
	 * Check if a cell is a given (initial clue).
	 */
	isGiven(index: number): boolean {
		return this.givens[index] !== 0;
	}

	/**
	 * Get a copy of the current values.
	 */
	getValues(): Grid {
		return [...this.values];
	}

	/**
	 * Get a copy of the givens.
	 */
	getGivens(): Grid {
		return [...this.givens];
	}

	/**
	 * Check if the grid is solved.
	 */
	isSolved(): boolean {
		return this.values.every((v) => v !== 0);
	}

	/**
	 * Get all cell indices in a row.
	 */
	static getRowIndices(row: number): number[] {
		const indices: number[] = [];
		for (let c = 0; c < 9; c++) {
			indices.push(row * 9 + c);
		}
		return indices;
	}

	/**
	 * Get all cell indices in a column.
	 */
	static getColIndices(col: number): number[] {
		const indices: number[] = [];
		for (let r = 0; r < 9; r++) {
			indices.push(r * 9 + col);
		}
		return indices;
	}

	/**
	 * Get all cell indices in a box.
	 */
	static getBoxIndices(boxRow: number, boxCol: number): number[] {
		const indices: number[] = [];
		for (let r = 0; r < 3; r++) {
			for (let c = 0; c < 3; c++) {
				indices.push((boxRow * 3 + r) * 9 + (boxCol * 3 + c));
			}
		}
		return indices;
	}

	/**
	 * Get row, column, and box indices for a cell.
	 */
	static getCellPosition(index: number): {
		row: number;
		col: number;
		boxRow: number;
		boxCol: number;
	} {
		const row = Math.floor(index / 9);
		const col = index % 9;
		const boxRow = Math.floor(row / 3);
		const boxCol = Math.floor(col / 3);
		return { row, col, boxRow, boxCol };
	}

	/**
	 * Eliminate a digit from all peers of a cell (same row, column, box).
	 */
	private eliminateFromPeers(index: number, digit: number): void {
		const { row, col, boxRow, boxCol } = SolverGrid.getCellPosition(index);
		const bit = 1 << (digit - 1);

		// Eliminate from row
		for (const i of SolverGrid.getRowIndices(row)) {
			if (i !== index) {
				this.candidates[i] &= ~bit;
			}
		}

		// Eliminate from column
		for (const i of SolverGrid.getColIndices(col)) {
			if (i !== index) {
				this.candidates[i] &= ~bit;
			}
		}

		// Eliminate from box
		for (const i of SolverGrid.getBoxIndices(boxRow, boxCol)) {
			if (i !== index) {
				this.candidates[i] &= ~bit;
			}
		}
	}

	/**
	 * Create a copy of this grid.
	 */
	clone(): SolverGrid {
		const clone = new SolverGrid(this.values, this.givens);
		clone.candidates = [...this.candidates];
		return clone;
	}
}
