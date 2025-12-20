# Repository Guidelines

## Project Structure & Module Organization
- Monorepo: `frontend/` (SvelteKit + Tailwind + TypeScript) with routes/components in `src/` and build output in `build/`; `backend/` Go API with entrypoint `cmd/api` and domain packages under `internal/` (solver, puzzles, ranking, auth).
- Tooling lives in `Makefile`, `scripts/` (dev orchestration, DB wait), and `docker-compose.yml` (Postgres). Docs live in `README.md`, `GENERATE_PUZZLE.md`, and `prompts/`.

## Build, Test, and Development Commands
- `make db-up` / `make db-down`: start/stop Postgres locally.
- `make dev`: `scripts/dev.sh` starts Go API (`go run` or `gow`) and SvelteKit (`bun run dev -- --host 0.0.0.0 --port 5173`).
- `make dev-backend` / `make dev-frontend`: run one side only.
- `make build`: `bun run build` for the frontend; `go build -o bin/api ./cmd/api` for the backend.
- `make test`: Go unit tests (`go test ./...`). `make lint` / `make lint-fix` run Prettier+ESLint and `golangci-lint` (if installed). `make fmt` applies Prettier, gofumpt, and goimports.

## Coding Style & Naming Conventions
- Frontend: TypeScript/Svelte with tabs (width 4) and single quotes; enforced by ESLint + Prettier. Components/lib helpers use PascalCase files; routes stay lower-case. Prefer Tailwind utilities over custom CSS.
- Backend: Go 1.22; stdlib imports first, then externals. Run `gofumpt` and `goimports` before pushing. Package names stay lower_snake; exported symbols use GoCamelCase.

## Testing Guidelines
- Tests live in `backend/internal/*/*_test.go`; prefer table-driven cases for solver/puzzle/ranking logic. Run `make test` (or `cd backend && go test ./...`) before opening a PR.
- Frontend currently relies on `bun run check` and `bun run lint`; add component tests (Playwright/Vitest) when adding complex UI logic.

## Commit & Pull Request Guidelines
- Commits in history are short, sentence-case summaries without prefixes (e.g., “More techniques and some cleanup”). Use imperative mood and keep scope focused.
- PRs should state intent, list key changes, and link issues. Include test runs (`make lint`, `make test`) and screenshots/GIFs for UI updates. Call out config/env changes.

## Configuration & Security
- Backend reads `API_ADDR`, `DATABASE_URL` (default `postgres://sudoku:sudoku@localhost:5432/sudoku?sslmode=disable`), `STATIC_DIR` (`../frontend/build`), and `COOKIE_SECURE` (`1` for secure cookies).
- Keep secrets out of git/compose overrides; store them in a local `.env` ignored by git and rotate DB credentials if shared.

## Solver Techniques
- When adding a new technique under `frontend/src/lib/solver/techniques`, also enable its difficulty in the generation modal dropdown in `frontend/src/routes/edit/[id]/+page.svelte` (Generate Puzzle modal).
- Ensure the evaluator uses the new technique by wiring imports/order in `frontend/src/lib/solver/techniques/index.ts` and `frontend/src/lib/solver/solver.ts`. Update difficulty accounting in `frontend/src/lib/solver/difficulty.ts` or ranges in `frontend/src/lib/solver/generator.ts` if the new level should be reachable.
