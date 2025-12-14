export type Grid = number[];

export const emptyGrid = (): Grid => Array.from({ length: 81 }, () => 0);

export const parseGivensString = (givens: string): Grid => {
	const s = givens.trim();
	if (s.length !== 81) {
		throw new Error('givens_must_be_81_chars');
	}

	const grid = emptyGrid();
	for (let i = 0; i < 81; i++) {
		const ch = s[i];
		if (ch === '.' || ch === '0') {
			grid[i] = 0;
			continue;
		}
		if (ch >= '1' && ch <= '9') {
			grid[i] = Number(ch);
			continue;
		}
		throw new Error(`invalid_char_${i}`);
	}
	return grid;
};

export const gridToGivensString = (grid: Grid): string => {
	if (grid.length !== 81) {
		throw new Error('grid_must_be_81');
	}
	return grid.map((n) => (n >= 1 && n <= 9 ? `${n}` : '0')).join('');
};

const values1to9 = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

const isUnitValid = (nums: number[]): boolean => {
	if (nums.length !== 9) {
		return false;
	}
	const s = new Set(nums);
	if (s.size !== 9) {
		return false;
	}
	for (const v of s) {
		if (!values1to9.has(v)) {
			return false;
		}
	}
	return true;
};

export const isSolved = (grid: Grid): boolean => {
	if (grid.length !== 81) {
		return false;
	}
	if (grid.some((n) => n === 0)) {
		return false;
	}

	for (let r = 0; r < 9; r++) {
		const row = grid.slice(r * 9, r * 9 + 9);
		if (!isUnitValid(row)) {
			return false;
		}
	}
	for (let c = 0; c < 9; c++) {
		const col = Array.from({ length: 9 }, (_, r) => grid[r * 9 + c]);
		if (!isUnitValid(col)) {
			return false;
		}
	}
	for (let br = 0; br < 3; br++) {
		for (let bc = 0; bc < 3; bc++) {
			const box: number[] = [];
			for (let r = 0; r < 3; r++) {
				for (let c = 0; c < 3; c++) {
					box.push(grid[(br * 3 + r) * 9 + (bc * 3 + c)]);
				}
			}
			if (!isUnitValid(box)) {
				return false;
			}
		}
	}

	return true;
};

