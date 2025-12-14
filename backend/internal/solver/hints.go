package solver

// Technique-based hinting is intentionally separate from the backtracking solver.
// The backtracking solver enforces "unique solution" today; a future technique engine can implement Hinter.
type TechniqueID string

type AffectedCell struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

type Hint struct {
	Technique      TechniqueID    `json:"technique"`
	Message        string         `json:"message"`
	AffectedCells  []AffectedCell `json:"affectedCells,omitempty"`
	HighlightedRow *int           `json:"highlightedRow,omitempty"`
	HighlightedCol *int           `json:"highlightedCol,omitempty"`
}

type Hinter interface {
	NextHint(grid Grid) (*Hint, error)
}

type NotImplementedHinter struct{}

func (h NotImplementedHinter) NextHint(grid Grid) (*Hint, error) {
	return nil, nil
}
