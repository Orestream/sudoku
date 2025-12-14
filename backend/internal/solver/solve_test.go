package solver

import "testing"

func TestParseAndNormalize(t *testing.T) {
	t.Parallel()

	_, _, err := ParseAndNormalize("short")
	if err == nil {
		t.Fatalf("expected error for non-81-char input")
	}

	in := "53..7...." +
		"6..195..." +
		".98....6." +
		"8...6...3" +
		"4..8.3..1" +
		"7...2...6" +
		".6....28." +
		"...419..5" +
		"....8..79"

	normalized, _, err := ParseAndNormalize(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(normalized) != 81 {
		t.Fatalf("expected normalized to be 81 chars, got %d", len(normalized))
	}
}

func TestCountSolutionsUnique(t *testing.T) {
	t.Parallel()

	in := "530070000" +
		"600195000" +
		"098000060" +
		"800060003" +
		"400803001" +
		"700020006" +
		"060000280" +
		"000419005" +
		"000080079"

	_, grid, err := ParseAndNormalize(in)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}

	count, err := CountSolutions(grid, 2)
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 solution, got %d", count)
	}
}

func TestCountSolutionsConflict(t *testing.T) {
	t.Parallel()

	in := "110000000" +
		"000000000" +
		"000000000" +
		"000000000" +
		"000000000" +
		"000000000" +
		"000000000" +
		"000000000" +
		"000000000"

	_, grid, err := ParseAndNormalize(in)
	if err == nil {
		t.Fatalf("expected conflict to error")
	}

	_ = grid
}

