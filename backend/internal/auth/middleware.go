package auth

import (
	"context"
	"net/http"
)

type contextKey int

const (
	userContextKey contextKey = iota
)

func WithUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

func UserFromContext(ctx context.Context) *User {
	v := ctx.Value(userContextKey)
	if v == nil {
		return nil
	}
	u, _ := v.(*User)
	return u
}

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

