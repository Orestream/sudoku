.PHONY: db-up db-down dev dev-backend dev-frontend lint lint-fix fmt test build

db-up:
	@docker compose up -d db
	@bash scripts/wait-for-db.sh

db-down:
	@docker compose down

dev: db-up
	@bash scripts/dev.sh

dev-backend: db-up
	@cd backend && if command -v gow >/dev/null 2>&1; then gow -c run ./cmd/api; else go run ./cmd/api; fi

dev-frontend:
	@cd frontend && bun run dev

lint:
	@cd frontend && bun run lint
	@cd backend && if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run ./...; else echo "golangci-lint not found, skipping Go linting"; fi

lint-fix:
	@cd frontend && bun run lint:fix
	@cd backend && if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run --fix ./...; else echo "golangci-lint not found, skipping Go linting"; fi

fmt:
	@cd frontend && bun run fmt
	@cd backend && gofumpt -w . && goimports -w .

test:
	@cd backend && go test ./...

build:
	@cd frontend && bun run build
	@cd backend && mkdir -p bin && go build -o bin/api ./cmd/api
