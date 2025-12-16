// Package main provides the entry point for the Sudoku API server.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sudoku/backend/internal/auth"
	"sudoku/backend/internal/config"
	"sudoku/backend/internal/db"
	httpserver "sudoku/backend/internal/http"
	"sudoku/backend/internal/puzzles"
)

func main() {
	cfg := config.FromEnv()

	gormDB, err := db.Open(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}

	if err := auth.AutoMigrate(gormDB); err != nil {
		log.Fatalf("db migrate auth: %v", err)
	}
	if err := puzzles.AutoMigrate(gormDB); err != nil {
		log.Fatalf("db migrate: %v", err)
	}

	authService := auth.NewService(gormDB)
	puzzleService := puzzles.NewService(gormDB)
	handler := httpserver.NewHandler(httpserver.HandlerDeps{
		Config:        cfg,
		AuthService:   authService,
		PuzzleService: puzzleService,
	})

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
