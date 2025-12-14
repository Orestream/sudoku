You are Cursor AI acting as a senior full-stack engineer. Generate a complete monorepo for a Sudoku web app with:

## GOALS
- Single repo full-stack project:
	- Frontend: SvelteKit + TailwindCSS, TypeScript, strict ESLint.
	- Backend: Go REST API using GORM, Postgres (docker compose).
	- Option A deployment model: SvelteKit builds to static assets and Go serves them in production (same origin). In dev, run Vite dev server + Go API with proxy.
- Provide a Makefile that:
	- Ensures Postgres is running and HEALTHY before starting backend/frontend.
	- Runs backend with `gow` (Go watcher).
	- Has targets for lint/format/test/build.
- Enforce clean, consistent code style:
	- Frontend: strict ESLint + Prettier formatting integrated (lint should fail on style issues).
	- Use tabs for indentation with tabWidth=4 in frontend formatting.
	- Prefer single quotes in frontend JS/TS and Svelte scripts.
	- Prefer template literals over string concatenation in frontend.
	- For Go: Go strings MUST use double quotes (language syntax). Keep Go idiomatic with gofmt/gofumpt and avoid manual string concatenation when it harms readability; prefer fmt.Sprintf, strings.Builder, or templates as appropriate.
- Recommend and configure a strict Go linter:
	- Use `golangci-lint` with a reasonably strict config (staticcheck, govet, errcheck, revive, ineffassign, typecheck, unused, etc.).
	- Also use `gofumpt` + `goimports` for formatting/imports.

## CRITICAL PROJECT CONVENTIONS
- Difficulty votes are **1–5** initially (1=Easy … 5=Expert) but MUST be flexible to add more levels later.
	- Treat difficulty as an `int` everywhere.
	- Avoid hardcoding assumptions beyond “positive integer”; UI can default to 1–5 but should be driven by a shared list/config to allow later expansion.
- GORM model rules:
	- All IDs must be **uint**. Use `ID uint` with `gorm:"primaryKey"`.
	- All nullable DB fields must use **pointer types** in Go (e.g. `*string`, `*bool`, `*time.Time`, `*int`).
	- All non-nullable DB fields must use **non-pointer values**.
	- For JSON responses, omit nulls where appropriate with `omitempty`.

## SUDOKU DOMAIN REQUIREMENTS
- Home screen: “Play” and “Create puzzles”.
- Play flow:
	- Choose difficulty first (dropdown).
	- After selection, show a dropdown still visible to change difficulty.
	- Puzzles are “rated by players”, including difficulty: the displayed difficulty and filtering should be derived from player votes over time (creator provides only a default suggestion).
	- After finishing a puzzle, the player can:
		- Vote what difficulty it SHOULD have been.
		- Like or dislike the puzzle (“goodness” rating).
	- Puzzles per difficulty are sorted by goodness rating (use a robust ranking like Wilson score; store likes/dislikes and compute ranking).
- Create flow:
	- Sudoku editor grid; creator can set a default difficulty suggestion.
	- Puzzle cannot be submitted if it has more than one solution.
	- Backend MUST validate: solvable AND unique solution before inserting.
- Future advanced solver support:
	- Implement architecture that will later support “hints based on real solving techniques.”
	- Include interfaces/types so adding technique-based hinting later won’t require rewriting API/contracts.
- Future advanced creator feature:
	- Provide stubs/design to later add a tool that removes givens to maximize difficulty, e.g. remove a number only if the puzzle then REQUIRES more advanced techniques.
	- For now, implement placeholder endpoint(s) and internal package structure; no need to fully implement advanced technique rating yet, but design must accommodate it.

## DELIVERABLES / REPO STRUCTURE
Create a repo with at least:

- `/backend`
	- `go.mod`, `cmd/api/main.go`, `internal/...`
	- `internal/config` (env/config)
	- `internal/db` (GORM init)
	- `internal/http` (router, middleware)
	- `internal/puzzles` (service + handlers)
	- `internal/solver` (backtracking + uniqueness count + hint interfaces)
	- `internal/ranking` (Wilson score)
	- `.golangci.yml`
- `/frontend`
	- SvelteKit + TS + Tailwind
	- ESLint + Prettier configured to:
		- `useTabs: true`
		- `tabWidth: 4`
		- `singleQuote: true` (JS/TS)
		- `prefer-template: error`
		- disallow useless concat
	- Vite dev proxy so frontend can call `/api/*` without CORS pain
	- Routes:
		- `/` (home)
		- `/play` (difficulty dropdown + puzzle list)
		- `/play/[id]` (play a puzzle + completion flow with rating UI)
		- `/create` (editor + validation + submit)
- `docker-compose.yml` at repo root for Postgres only
	- includes healthcheck using `pg_isready`
- `Makefile` at repo root
	- targets: `db-up`, `db-down`, `db-reset`, `dev`, `backend-dev`, `frontend-dev`, `lint`, `fmt`, `test`, `build`, `tools`
	- `db-up` must block until db is healthy
	- `dev` must run `db-up` first, then run backend (gow) and frontend concurrently
	- `tools` target installs `gow`, `golangci-lint`, `gofumpt`, `goimports` (pin versions or document)
- `README.md` with quickstart + dev workflow
- `.env.example` (DB connection values) and backend reads env vars.

## TECH CHOICES (USE THESE)
- SvelteKit `adapter-static` for production build.
- TailwindCSS for styling.
- Go HTTP router: `chi` (preferred) or standard `net/http`, but keep it clean and testable.
- Postgres + GORM.
- Sudoku grid format:
	- Store givens as a compact string length 81 using `.` or `0` for empty (choose one and document it; be consistent).
	- Never send a stored solution to clients.
- Players:
	- Keep it simple: anonymous player id generated in frontend (UUID in `localStorage`) sent in header `X-Player-Id`.
	- Backend stores votes keyed by `(player_id, puzzle_id)` to prevent duplicate votes.
	- Do not build full auth yet.

## API DESIGN (MINIMUM)
Implement these endpoints (all JSON):

- `GET /api/health`
- `POST /api/puzzles/validate`
	- body: `{ givens: string }` (81 chars)
	- response: `{ ok: boolean, errors: string[], unique: boolean, solvable: boolean }`
- `POST /api/puzzles`
	- body: `{ title?: string, givens: string, creatorSuggestedDifficulty: number }`
	- validates unique+solvable; rejects otherwise
- `GET /api/puzzles`
	- query: `difficulty=...` (bucket), `sort=top`, `page=`, `pageSize=`
	- returns puzzle list without solution, includes `aggregatedDifficulty` and `goodnessRank`
- `GET /api/puzzles/:id`
	- returns puzzle details needed to play (givens, stats) but never the solution
- `POST /api/puzzles/:id/complete`
	- body: `{ timeMs: number, difficultyVote: number, liked: boolean|null }`
	- record completion + vote; update aggregates
- `GET /api/puzzles/:id/hint`
	- for now return `{ available: false, reason: 'not_implemented' }` but define response types for future technique hints

## DATABASE SCHEMA (MINIMUM)
Use GORM models and AutoMigrate on startup:

- `puzzles`
	- `id` (int PK)
	- `title` (nullable)
	- `givens` (non-null)
	- `creator_suggested_difficulty` (non-null int)
	- `created_at` (non-null)
- `puzzle_votes`
	- `id` (int PK)
	- `puzzle_id` (non-null int FK)
	- `player_id` (non-null text)
	- `difficulty_vote` (non-null int)
	- `liked` (nullable bool)
	- `completed_at` (non-null time)
	- `time_ms` (non-null int)
- derived fields computed in queries:
	- aggregated difficulty (avg/median of votes)
	- goodness ranking (Wilson score based on likes/dislikes)

Ensure uniqueness: one vote per `(puzzle_id, player_id)` with a unique index.

## SOLVER REQUIREMENTS (NOW)
Implement a correct backtracking solver + solution counter:

- Parse 81-char string into grid
- Validate initial givens (no conflicts)
- `CountSolutions(grid, limit=2)` returns 0/1/2+ (stop at 2)
- Used by validate + create endpoints

This is required so “multiple solutions cannot be submitted.”

## FUTURE-PROOF SOLVER DESIGN (ARCHITECTURE NOW)
Inside `internal/solver`:

- Define types:
	- `TechniqueID string`
	- `Hint struct { technique: TechniqueID; message: string; affectedCells: ... }`
	- `Hinter interface { NextHint(grid) (*Hint, error) }`
- Provide a placeholder implementation that returns nil/“not implemented”.
- Keep backtracking solver separate from technique engine (so later we can add human-style strategies without breaking API).

## FRONTEND UI REQUIREMENTS
- Clean minimal UI with Tailwind.
- Home page with two big buttons: Play / Create.
- Play page:
	- difficulty dropdown at top; once selected, keep it visible (same control) and show list of puzzles for that difficulty
	- puzzle cards show “community difficulty” + likes/dislikes and maybe completion count
	- sorting by goodness rank by default
- Puzzle play page:
	- render 9x9 grid, givens locked
	- basic input (click cell + number keys/buttons)
	- detect completion locally; then show completion modal to:
		- vote difficulty (UI supports 1–5 now but built to expand)
		- like/dislike
		- submit (POST complete)
- Create page:
	- editor grid input
	- button “Validate” (calls `/api/puzzles/validate`; show errors, and whether unique)
	- suggested difficulty input (1–5 now, built to expand)
	- submit button disabled until validate passes unique+solvable
	- include stub UI element for future “Optimize difficulty (remove givens)” feature (disabled, tooltip “coming later”)

## DEV WORKFLOW REQUIREMENTS
- `make db-up` starts Postgres and waits until healthy.
- `make dev` starts db, then:
	- backend on `:8080` via `gow`
	- frontend on `:5173`
- Frontend dev server proxies `/api` to `http://localhost:8080`.
- `make lint` runs:
	- frontend eslint (strict)
	- backend golangci-lint
- `make fmt` runs:
	- frontend prettier (tabs, 4 width, single quotes)
	- backend gofumpt + goimports
- `make build` builds frontend static output then builds backend.
- Production behavior:
	- backend serves embedded static assets (`go:embed`) OR serves from a `/frontend/build` directory; choose one and implement it cleanly.
	- API under `/api`; all other routes serve `index.html` (SPA fallback).

## STYLE RULES (IMPORTANT)
- Frontend:
	- tabs indentation, `tabWidth=4`
	- single quotes
	- prefer template literals
	- no string concatenation
- Use TypeScript everywhere reasonable (Svelte scripts included).
- Backend:
	- gofmt/gofumpt formatting; clean imports via goimports
	- explicit error handling; no panic in request handlers
	- enforce GORM pointer/non-pointer rules above
- Keep code readable and modular; avoid giant files.

## OUTPUT INSTRUCTIONS
- Create all files needed. Do not leave TODOs for core requirements (solver uniqueness check, validate + create endpoints, db health waiting, dev scripts).
- It’s okay to keep UI minimal, but it must be functional end-to-end:
	- create -> validate unique -> submit -> play -> complete -> vote difficulty + like/dislike -> list sorted by goodness.
- Add brief comments where it helps future “technique hints” and “difficulty optimization” features.

After generating the repo, also output:
- Exact commands to run for first-time setup and starting dev.
- A short note describing where to implement technique-based hinting later (which package/files).

Now implement it.

