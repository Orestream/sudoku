package solver

import (
	"errors"
)

func CountSolutions(g Grid, limit int) (int, error) {
	if limit <= 0 {
		return 0, errors.New("invalid_limit")
	}
	if err := ValidateNoConflicts(g); err != nil {
		return 0, nil
	}

	usedRows, usedCols, usedBoxes := buildUsedMasks(g)
	count := 0
	var dfs func(Grid, [9]uint16, [9]uint16, [9]uint16)
	dfs = func(grid Grid, rows, cols, boxes [9]uint16) {
		if count >= limit {
			return
		}

		idx, candidates := pickNextCell(grid, rows, cols, boxes)
		if idx == -1 {
			count++
			return
		}
		if candidates == 0 {
			return
		}

		for digit := uint8(1); digit <= 9; digit++ {
			bit := uint16(1) << digit
			if candidates&bit == 0 {
				continue
			}

			r := idx / 9
			c := idx % 9
			b := (r/3)*3 + (c / 3)

			grid2 := grid
			grid2[idx] = digit

			rows2 := rows
			cols2 := cols
			boxes2 := boxes
			rows2[r] |= bit
			cols2[c] |= bit
			boxes2[b] |= bit

			dfs(grid2, rows2, cols2, boxes2)
			if count >= limit {
				return
			}
		}
	}

	dfs(g, usedRows, usedCols, usedBoxes)
	return count, nil
}

func buildUsedMasks(g Grid) (rows, cols, boxes [9]uint16) {
	for i := 0; i < 81; i++ {
		v := g[i]
		if v == 0 {
			continue
		}
		r := i / 9
		c := i % 9
		b := (r/3)*3 + (c / 3)
		bit := uint16(1) << v
		rows[r] |= bit
		cols[c] |= bit
		boxes[b] |= bit
	}
	return rows, cols, boxes
}

func pickNextCell(g Grid, rows, cols, boxes [9]uint16) (idx int, candidates uint16) {
	bestIdx := -1
	bestCount := 10
	var bestCandidates uint16

	for i := 0; i < 81; i++ {
		if g[i] != 0 {
			continue
		}

		r := i / 9
		c := i % 9
		b := (r/3)*3 + (c / 3)
		used := rows[r] | cols[c] | boxes[b]
		cands := (^used) & 0x3FE
		candCount := bitsCount16(cands)
		if candCount == 0 {
			return i, 0
		}
		if candCount < bestCount {
			bestIdx = i
			bestCount = candCount
			bestCandidates = cands
			if bestCount == 1 {
				return bestIdx, bestCandidates
			}
		}
	}

	return bestIdx, bestCandidates
}

func bitsCount16(x uint16) int {
	n := 0
	for x != 0 {
		x &= x - 1
		n++
	}
	return n
}

