# Optimizing `generatePuzzle(targetDifficulty)` (mobile-friendly)

## Goal
Increase the probability that `generatePuzzleExact(targetDifficulty)` returns an *exact* match (especially `targetDifficulty = 6`) without increasing compute to the point that it feels slow on a phone.

## Why the current approach misses the target (esp. high difficulty)
Current `frontend/src/lib/solver/generator.ts` is a **single-path greedy digger**:
- It removes one clue at a time in a random order.
- It **rejects** any removal that makes the puzzle `> targetDifficulty` or `!log.solved`.
- It has **no backtracking / add-back**, so if it gets “stuck at 5” it can’t explore swaps like “add this clue back, remove a different one”.

For higher difficulties, the “good” region is narrow:
- Many removals keep the puzzle **too easy**.
- A bunch of removals push the puzzle into **stuck** (requires techniques beyond the current solver’s reach) or **overshoots** the discrete difficulty bucket.
- The greedy strategy hits a local minimum and then restarts from scratch, so exact hits become rare.

## Proposed algorithm: Guided search with bidirectional moves (remove + add-back)
Replace “single greedy path” with a **small beam search / local search** that:
- explores a few alternatives in parallel (keeps diversity),
- allows **temporary overshoot/stuck states** and recovers by **adding back** clues,
- uses an **early-exit evaluator** so “bad” candidates are rejected cheaply.

This increases hit-rate dramatically while keeping a tight budget (beam width and sampled moves).

### Core idea in one sentence
Treat puzzle generation as a **search problem** over clue-sets; keep the best few candidates and iteratively apply the cheapest move that reduces “distance to target difficulty”.

---

## Building blocks

### 1) Fast evaluator with early exit (biggest CPU win)
Instead of always calling `solveAll()` and then `calculateDifficulty(log)`:
- Solve step-by-step and maintain `maxDifficulty` + counts per difficulty.
- Recompute the *current* calculated difficulty from the partial counts.
- **Stop early** if we already know this candidate can’t be accepted.

Early exit conditions (for target `T`):
- If the solver gets stuck (`!grid.isSolved()` and `!canSolveStep()`): mark as `stuck`.
- If `maxDifficulty > T`: mark as `tooHard`.
- If the *frequency bonus* already forces `calculatedDifficulty > T` (e.g. `T=6` and `count[6] >= 3`): mark as `tooHard`.

This makes “overshoot/stuck” checks much cheaper, which matters because search evaluates many candidates.

Recommended refactor:
- Extract the logic in `calculateDifficulty(log)` into a helper that can compute from `(maxDifficulty, difficultyCounts)` so the evaluator can update incrementally.

### 2) Clue-count bracketing (cheap coarse control)
Use clue count as a first-order knob so the search starts in the right neighborhood:
- Maintain a per-difficulty `targetGivensRange` (calibrated empirically).
- Start by removing random clues (optionally symmetric pairs) until within the range.
- Only then start difficulty tuning.

This avoids wasting time evaluating puzzles that have “obviously too many” or “far too few” givens for the desired tier.

Calibration plan:
- Add a dev-only script that samples a few hundred puzzles and records `(givensCount, calculatedDifficulty)` to tune the ranges.
- Store a conservative default table in code and iterate later.

### 3) Bidirectional moves (critical for exact difficulty)
Allow both:
- **Remove** a clue (make harder), and
- **Add back** a clue from the known solution (make easier / un-stuck).

Key property: because we always add back the digit from the solved grid, the puzzle remains consistent and solvable.

### 4) Beam search with tiny beam (diversity without explosion)
Keep a small set of candidates (“beam”) at each iteration:
- `beamWidth` ~ 4–10
- For each candidate, try only `k` sampled moves (not all 81 cells).
- Select the best next beam by score.

This avoids the “single path got stuck, restart” failure mode and still fits mobile CPU budgets.

### 5) Memoization inside one generation run (avoid re-solving duplicates)
In beam/local search, you often revisit the same clue-set via different sequences of moves.
Cache evaluation results in a bounded map keyed by the puzzle string (81 chars).

---

## Scoring function (distance to target)
We need to rank candidates even when they’re not exact.

Use a lexicographic score (lower is better):
1. `solvedPenalty`: `0` if solved, `1` if stuck (stuck is “too hard” for tiers 1–6).
2. `difficultyDistance`: `abs(calculatedDifficulty - T)`
3. `directionPenalty`:
   - If `calculatedDifficulty > T`: add a penalty so we prefer “slightly too easy” over “too hard”.
   - If stuck: add a bigger penalty than any solved-but-wrong candidate.
4. `givensPenalty`: distance to the center of `targetGivensRange[T]` (keeps the search in the right region).

Special handling for `T=6` (where exact hits are currently rare):
- Prefer candidates where `maxDifficulty` is 6 but the frequency bonus does **not** bump above 6.
- That means: treat `count[6] >= 3` as immediate “too hard” for the 1–6 generator.

---

## Algorithm (step-by-step)

### Phase A — Seed generation (cheap)
1. `solution = generateSolvedGrid()`
2. `puzzle = solution.clone()`
3. Randomly remove clues (optionally symmetric pairs) until `givensCount` is inside `targetGivensRange[T]`.
4. (Optional) Uniqueness check:
   - Run `countSolutions(puzzle, 2)` only near the end of Phase A or only for the final candidate.

Result: a reasonable starting point close to the target tier.

### Phase B — Difficulty tuning (beam search)
Initialize:
- `beam = [seedPuzzle]`
- `best = seedPuzzle`
- `cache = new LRUMap(max=~500-2000)`

Loop (bounded by time or iterations):
1. Evaluate each puzzle in `beam` with the **early-exit evaluator**.
2. If any candidate has `calculatedDifficulty == T` and `solved`: return it.
3. Expand each beam node with a few moves:
   - If candidate is `stuck` or `difficulty > T`: generate **add-back** moves.
   - If candidate is `solved` and `difficulty < T`: generate **remove** moves.
4. For each candidate, *sample* `k` legal moves (e.g. 8–16) and evaluate them (cached).
5. Collect all children, pick the best `beamWidth`, update `best`.
6. Yield to the UI (`await yieldToMain()`) every N evaluations.

Exit:
- If exact not found, return `best` (or throw if strict).

---

## Move generation heuristics (keep k small but meaningful)
Sampling beats brute force on mobile.

### Remove-clue candidates (when too easy)
Start with a random subset of givens, but bias toward:
- clues in areas that currently produce lots of singles (to “break” easy progress),
- clues that are in rows/cols/boxes with high given density (often lower impact on uniqueness but can increase technique needs).

Practical, low-effort heuristic:
- Take the current solve log once.
- Prefer removing *givens* that overlap with many `affectedCells` in low-difficulty steps (they’re “supporting” easy deductions).

### Add-back candidates (when stuck / too hard)
Prefer adding back a clue that:
- was involved in the *hardest* technique steps (high `affectedCells` overlap), or
- lies in a region with many unsolved cells (helps unblock).

Minimal heuristic:
- Sample empty cells uniformly; add back the correct digit from `solution`.

---

## Pseudocode
```ts
generatePuzzleExactV2(T, opts):
  solution = generateSolvedGrid()
  seed = seedByGivensRange(solution, targetGivensRange[T])

  beam = [seed]
  best = seed
  cache = new LRUCache()

  while withinBudget(opts):
    expanded = []
    for p of beam:
      eval = cachedEval(p)
      if eval.solved && eval.diff == T: return p

      moves = (eval.stuck || eval.diff > T) ? proposeAddBackMoves(p) : proposeRemoveMoves(p)
      for move of sample(moves, opts.movesPerNode):
        p2 = apply(move, p, solution)
        if opts.unique && move.isRemoval && countSolutions(p2, 2) != 1: continue
        expanded.push(p2)

    beam = topK(expanded, opts.beamWidth, score)
    best = min(best, ...beam, score)
    maybeYield()

  return best (or throw)
```

---

## Suggested mobile defaults
- `beamWidth`: 6 (difficulty 1–4), 8 (difficulty 5–6)
- `movesPerNode`: 10–14
- `maxIterations`: 80–160 (or `maxTimeMs`: 800–1500ms)
- `cacheSize`: 1000 entries
- Yield every ~100–200 evaluations (`setTimeout(0)` or `requestIdleCallback` when available)

This is typically *less* total work than “50 full restarts”, because it reuses near-miss candidates instead of discarding them.

---

## Implementation checklist (in repo terms)
1. Add an incremental evaluator in `frontend/src/lib/solver/generator.ts` (or a helper file) that can stop early.
2. Add `add-back` and `swap` operations (extend `optimizeDifficulty` to handle decreasing difficulty).
3. Implement the Phase A + Phase B generator as a new function (keep existing API, swap the internals).
4. Add lightweight instrumentation (optional) to log hit rate and average eval count per difficulty in dev mode.
5. Tune `targetGivensRange` and the beam parameters based on real measurements on a mid-tier phone.

