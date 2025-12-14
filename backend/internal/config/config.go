package config

import (
	"os"
)

type Config struct {
	Addr        string
	DatabaseURL string
	StaticDir   string
	CookieSecure bool
}

func FromEnv() Config {
	addr := envOrDefault("API_ADDR", ":8080")
	dbURL := envOrDefault("DATABASE_URL", "postgres://sudoku:sudoku@localhost:5432/sudoku?sslmode=disable")
	staticDir := envOrDefault("STATIC_DIR", "../frontend/build")
	cookieSecure := envOrDefault("COOKIE_SECURE", "") == "1"

	return Config{
		Addr:        addr,
		DatabaseURL: dbURL,
		StaticDir:   staticDir,
		CookieSecure: cookieSecure,
	}
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
