package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"sudoku/backend/internal/httputil"
)

type HandlerDeps struct {
	Service      *Service
	CookieSecure bool
}

func NewHandler(deps HandlerDeps) http.Handler {
	h := &handler{
		service:      deps.Service,
		cookieSecure: deps.CookieSecure,
	}

	r := chi.NewRouter()
	r.Get("/me", h.me)
	r.With(RequireAuth).Get("/stats", h.stats)
	r.Post("/register", h.register)
	r.Post("/login", h.login)
	r.Post("/logout", h.logout)
	return r
}

type handler struct {
	service      *Service
	cookieSecure bool
}

type meResponse struct {
	User *PublicUser `json:"user"`
}

func (h *handler) me(w http.ResponseWriter, r *http.Request) {
	u := UserFromContext(r.Context())
	if u == nil {
		httputil.WriteJSON(w, http.StatusOK, meResponse{User: nil})
		return
	}
	public := toPublicUser(*u)
	httputil.WriteJSON(w, http.StatusOK, meResponse{User: &public})
}

type registerRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	DisplayName *string `json:"displayName"`
}

type authResponse struct {
	User PublicUser `json:"user"`
}

func (h *handler) register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
		return
	}

	user, err := h.service.Register(r.Context(), req.Email, req.Password, req.DisplayName)
	if err != nil {
		if err == ErrConflict {
			httputil.WriteError(w, http.StatusConflict, "email_taken")
			return
		}
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	token, expiresAt, err := h.service.CreateSession(r.Context(), user.ID)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	setSessionCookie(w, token, expiresAt, h.cookieSecure)

	httputil.WriteJSON(w, http.StatusCreated, authResponse{User: user})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
		return
	}

	u, err := h.service.Authenticate(r.Context(), req.Email, req.Password)
	if err != nil {
		if err == ErrUnauthorized {
			httputil.WriteError(w, http.StatusUnauthorized, "invalid_credentials")
			return
		}
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	token, expiresAt, err := h.service.CreateSession(r.Context(), u.ID)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	setSessionCookie(w, token, expiresAt, h.cookieSecure)

	httputil.WriteJSON(w, http.StatusOK, authResponse{User: toPublicUser(u)})
}

func (h *handler) logout(w http.ResponseWriter, r *http.Request) {
	c, _ := r.Cookie(CookieName())
	if c != nil && c.Value != "" {
		_ = h.service.DeleteSession(r.Context(), c.Value)
	}

	clearSessionCookie(w, h.cookieSecure)
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *handler) stats(w http.ResponseWriter, r *http.Request) {
	user := UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	stats, err := h.service.Stats(r.Context(), user.ID)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, stats)
}

func setSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName(),
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})
}

func clearSessionCookie(w http.ResponseWriter, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName(),
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})
}
