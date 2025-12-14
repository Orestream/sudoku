package optimizer

import (
	"context"

	"sudoku/backend/internal/solver"
)

// Optimizer is a stub for a future feature that removes givens in a way that increases
// difficulty by requiring more advanced human-style techniques (not just backtracking).
type Optimizer interface {
	OptimizeDifficulty(ctx context.Context, grid solver.Grid) (solver.Grid, error)
}
