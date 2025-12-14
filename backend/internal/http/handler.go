package http

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"sudoku/backend/internal/config"
	"sudoku/backend/internal/puzzles"
)

type HandlerDeps struct {
	Config        config.Config
	PuzzleService *puzzles.Service
}

func NewHandler(deps HandlerDeps) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Route("/api", func(api chi.Router) {
		api.Mount("/puzzles", puzzles.NewHandler(deps.PuzzleService))
	})

	staticDir := strings.TrimSpace(deps.Config.StaticDir)
	if staticDir == "" {
		r.NotFound(http.NotFound)
		return r
	}

	r.Mount("/", NewSPAServer(staticDir))
	return r
}

