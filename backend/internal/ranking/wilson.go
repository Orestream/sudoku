// Package ranking provides ranking algorithms for puzzles.
package ranking

import (
	"math"
)

// WilsonScore calculates the Wilson score interval lower bound for ranking puzzles.
func WilsonScore(positive, negative int) float64 {
	n := positive + negative
	if n <= 0 {
		return 0
	}

	z := 1.96
	phat := float64(positive) / float64(n)
	z2 := z * z

	return (phat + z2/(2*float64(n)) - z*math.Sqrt((phat*(1-phat)+z2/(4*float64(n)))/float64(n))) / (1 + z2/float64(n))
}

