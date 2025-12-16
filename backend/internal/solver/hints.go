package solver

// TechniqueID identifies a solving technique.
// Technique-based hinting is intentionally separate from the backtracking solver.
// The backtracking solver enforces "unique solution" today; a future technique engine can implement Hinter.
type TechniqueID string

// AffectedCell represents a cell affected by a hint.
type AffectedCell struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

// Hint provides information about a solving technique that can be applied.
type Hint struct {
	Technique      TechniqueID    `json:"technique"`
	Message        string         `json:"message"`
	AffectedCells  []AffectedCell `json:"affectedCells,omitempty"`
	HighlightedRow *int           `json:"highlightedRow,omitempty"`
	HighlightedCol *int           `json:"highlightedCol,omitempty"`
}

// Hinter provides hints for solving puzzles using human-style techniques.
type Hinter interface {
	NextHint(grid Grid) (*Hint, error)
}

// NotImplementedHinter is a stub implementation that returns no hints.
type NotImplementedHinter struct{}

// NextHint returns nil, indicating no hints are available.
func (h NotImplementedHinter) NextHint(_ Grid) (*Hint, error) {
	return nil, nil
}
