export type SudokuAnalysis = {
	valid: boolean;
	solvable: boolean;
	unique: boolean;
	solutionCount: number;
};

const FULL_MASK = (1 << 9) - 1;

const popcount9 = (n: number): number => {
	let c = 0;
	while (n) {
		n &= n - 1;
		c++;
	}
	return c;
};

const digitFromBit = (bit: number): number => 32 - Math.clz32(bit);

const buildMasks = (grid: number[]) => {
	const rowMask = Array.from({ length: 9 }, () => 0);
	const colMask = Array.from({ length: 9 }, () => 0);
	const boxMask = Array.from({ length: 9 }, () => 0);

	for (let i = 0; i < 81; i++) {
		const v = grid[i] ?? 0;
		if (v === 0) {
			continue;
		}
		if (v < 1 || v > 9) {
			return null;
		}
		const r = Math.floor(i / 9);
		const c = i % 9;
		const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
		const bit = 1 << (v - 1);
		if (rowMask[r] & bit) return null;
		if (colMask[c] & bit) return null;
		if (boxMask[b] & bit) return null;
		rowMask[r] |= bit;
		colMask[c] |= bit;
		boxMask[b] |= bit;
	}

	return { rowMask, colMask, boxMask };
};

export const countSolutions = (grid: number[], limit = 2): number => {
	if (grid.length !== 81) {
		return 0;
	}
	const masks = buildMasks(grid);
	if (!masks) {
		return 0;
	}

	const { rowMask, colMask, boxMask } = masks;
	const values = grid.slice(0, 81);
	let count = 0;

	const search = (): void => {
		if (count >= limit) {
			return;
		}

		let bestIndex = -1;
		let bestMask = 0;
		let bestCount = 10;

		for (let i = 0; i < 81; i++) {
			if (values[i] !== 0) {
				continue;
			}
			const r = Math.floor(i / 9);
			const c = i % 9;
			const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
			const candidates = FULL_MASK & ~(rowMask[r] | colMask[c] | boxMask[b]);
			const n = popcount9(candidates);
			if (n === 0) {
				return;
			}
			if (n < bestCount) {
				bestCount = n;
				bestIndex = i;
				bestMask = candidates;
				if (n === 1) {
					break;
				}
			}
		}

		if (bestIndex === -1) {
			count++;
			return;
		}

		const r = Math.floor(bestIndex / 9);
		const c = bestIndex % 9;
		const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);

		let m = bestMask;
		while (m) {
			const bit = m & -m;
			m -= bit;
			const digit = digitFromBit(bit);

			values[bestIndex] = digit;
			rowMask[r] |= bit;
			colMask[c] |= bit;
			boxMask[b] |= bit;

			search();

			values[bestIndex] = 0;
			rowMask[r] &= ~bit;
			colMask[c] &= ~bit;
			boxMask[b] &= ~bit;

			if (count >= limit) {
				return;
			}
		}
	};

	search();
	return count;
};

export const analyzeSudoku = (grid: number[]): SudokuAnalysis => {
	if (grid.length !== 81) {
		return { valid: false, solvable: false, unique: false, solutionCount: 0 };
	}
	const masks = buildMasks(grid);
	if (!masks) {
		return { valid: false, solvable: false, unique: false, solutionCount: 0 };
	}

	const solutions = countSolutions(grid, 2);
	return {
		valid: true,
		solvable: solutions > 0,
		unique: solutions === 1,
		solutionCount: solutions
	};
};

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

const shuffle = <T>(items: T[]): T[] => {
	const arr = [...items];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};

export const generateSolvedGrid = (): number[] => {
	// Fast generator: start from a canonical solved grid and shuffle bands/stacks + digits.
	const pattern = (r: number, c: number) => (r * 3 + Math.floor(r / 3) + c) % 9;

	const digits = shuffle(range(9)).map((n) => n + 1);
	const bands = shuffle(range(3));
	const stacks = shuffle(range(3));
	const rows = bands.flatMap((b) => shuffle([0, 1, 2]).map((r) => b * 3 + r));
	const cols = stacks.flatMap((s) => shuffle([0, 1, 2]).map((c) => s * 3 + c));

	const out: number[] = [];
	out.length = 0;
	for (const r of rows) {
		for (const c of cols) {
			out.push(digits[pattern(r, c)]);
		}
	}
	return out;
};

