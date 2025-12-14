package ranking

import "testing"

func TestWilsonScoreOrdering(t *testing.T) {
	t.Parallel()

	if WilsonScore(0, 0) != 0 {
		t.Fatalf("expected 0 for no votes")
	}

	a := WilsonScore(1, 0)
	b := WilsonScore(10, 0)
	if b <= a {
		t.Fatalf("expected more positives to increase score: %v <= %v", b, a)
	}

	c := WilsonScore(1, 1)
	if c >= a {
		t.Fatalf("expected adding a negative to reduce score: %v >= %v", c, a)
	}
}

