# Sudoku (SvelteKit + Go + Postgres)

Monorepo with:

- `frontend/`: SvelteKit + Tailwind + TypeScript (ESLint + Prettier; tabs, 4 width, single quotes)
- `backend/`: Go REST API (GORM + Postgres)
- `docker-compose.yml`: Postgres only

## First-time setup

Prereqs: Docker, Go, Node.js (npm), and `make`.

```sh
make db-up
cd frontend && npm install
cd ../backend && go mod download
```

Optional (recommended) tools:

```sh
go install github.com/mitranim/gow@latest
go install mvdan.cc/gofumpt@latest
go install golang.org/x/tools/cmd/goimports@latest
```

## Start dev

```sh
make dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- API: `http://localhost:8080/api`

## Notes for future features

- Technique-based hints: start in `backend/internal/solver/hints.go` and implement a real `Hinter`.
- Difficulty optimization (remove givens): see stub in `backend/internal/puzzles/optimizer/optimizer.go`.

