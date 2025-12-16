package auth

import (
	"context"
	"net/http"
)

type contextKey int

const (
	userContextKey contextKey = iota
)

// WithUser adds a user to the context.
func WithUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

// UserFromContext retrieves the user from the context.
func UserFromContext(ctx context.Context) *User {
	v := ctx.Value(userContextKey)
	if v == nil {
		return nil
	}
	u, _ := v.(*User)
	return u
}

// Middleware creates an HTTP middleware that authenticates users via session cookies.
func Middleware(service *Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(CookieName())
			if err != nil || c == nil || c.Value == "" {
				next.ServeHTTP(w, r)
				return
			}

			user, err := service.UserFromSession(r.Context(), c.Value)
			if err != nil || user == nil {
				next.ServeHTTP(w, r)
				return
			}

			next.ServeHTTP(w, r.WithContext(WithUser(r.Context(), user)))
		})
	}
}

// RequireAuth creates an HTTP middleware that requires authentication.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if UserFromContext(r.Context()) == nil {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}

