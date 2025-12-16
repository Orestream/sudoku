// Package solver provides Sudoku puzzle solving functionality.
package solver

import (
	"errors"
	"fmt"
	"strings"
)

// Grid represents a 9x9 Sudoku grid.
type Grid [81]uint8

// ParseAndNormalize parses a string representation of a Sudoku puzzle and returns a normalized string and grid.
func ParseAndNormalize(input string) (string, Grid, error) {
	s := strings.TrimSpace(input)
	s = strings.ReplaceAll(s, "\n", "")
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, " ", "")

	if len(s) != 81 {
		return "", Grid{}, errors.New("givens_must_be_81_chars")
	}

	var g Grid
	var b strings.Builder
	b.Grow(81)

	for i := 0; i < 81; i++ {
		ch := s[i]
		switch {
		case ch == '.' || ch == '0':
			g[i] = 0
			b.WriteByte('0')
		case ch >= '1' && ch <= '9':
			g[i] = ch - '0'
			b.WriteByte(ch)
		default:
			return "", Grid{}, fmt.Errorf("invalid_char_at_%d", i)
		}
	}

	if err := ValidateNoConflicts(g); err != nil {
		return "", Grid{}, err
	}

	return b.String(), g, nil
}

// ValidateNoConflicts checks that a grid has no conflicts in rows, columns, or boxes.
func ValidateNoConflicts(g Grid) error {
	for r := 0; r < 9; r++ {
		var seen uint16
		for c := 0; c < 9; c++ {
			v := g[r*9+c]
			if v == 0 {
				continue
			}
			bit := uint16(1) << v
			if seen&bit != 0 {
				return errors.New("row_conflict")
			}
			seen |= bit
		}
	}

	for c := 0; c < 9; c++ {
		var seen uint16
		for r := 0; r < 9; r++ {
			v := g[r*9+c]
			if v == 0 {
				continue
			}
			bit := uint16(1) << v
			if seen&bit != 0 {
				return errors.New("col_conflict")
			}
			seen |= bit
		}
	}

	for br := 0; br < 3; br++ {
		for bc := 0; bc < 3; bc++ {
			var seen uint16
			for r := 0; r < 3; r++ {
				for c := 0; c < 3; c++ {
					v := g[(br*3+r)*9+(bc*3+c)]
					if v == 0 {
						continue
					}
					bit := uint16(1) << v
					if seen&bit != 0 {
						return errors.New("box_conflict")
					}
					seen |= bit
				}
			}
		}
	}

	return nil
}

