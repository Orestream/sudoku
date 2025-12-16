// Package puzzles provides puzzle management HTTP handlers.
package puzzles

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"sudoku/backend/internal/auth"
	"sudoku/backend/internal/httputil"
)

// NewHandler creates a new HTTP handler for puzzles.
func NewHandler(service *Service) http.Handler {
	h := &handler{service: service}

	r := chi.NewRouter()
	r.Post("/validate", h.validate)
	r.Post("/optimize", h.optimizeStub)

	r.Post("/", h.create)
	r.With(auth.RequireAuth).Get("/mine", h.mine)
	r.With(auth.RequireAuth).Put("/{id}", h.update)
	r.With(auth.RequireAuth).Post("/{id}/publish", h.publish)
	r.With(auth.RequireAuth).Delete("/{id}", h.deletePuzzle)
	r.Get("/", h.list)
	r.Get("/{id}", h.get)
	r.Post("/{id}/complete", h.complete)
	r.With(auth.RequireAuth).Get("/{id}/progress", h.getProgress)
	r.With(auth.RequireAuth).Put("/{id}/progress", h.saveProgress)
	r.With(auth.RequireAuth).Delete("/{id}/progress", h.clearProgress)
	r.Get("/{id}/hint", h.hintStub)
	return r
}

type handler struct {
	service *Service
}

func (h *handler) validate(w http.ResponseWriter, r *http.Request) {
	var req ValidateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
		return
	}

	resp, err := h.service.Validate(r.Context(), req)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) create(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreatePuzzleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		if !errors.Is(err, io.EOF) {
			httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
			return
		}
	}

	resp, err := h.service.Create(r.Context(), user.ID, req)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, resp)
}

func (h *handler) update(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id64, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 0)
	if err != nil || id64 == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}

	var req UpdatePuzzleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
		return
	}

	resp, err := h.service.Update(r.Context(), uint(id64), user.ID, req)
	if err != nil {
		httputil.WriteError(w, httpStatusFromError(err), err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) publish(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id64, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 0)
	if err != nil || id64 == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}

	resp, err := h.service.Publish(r.Context(), uint(id64), user.ID)
	if err != nil {
		httputil.WriteError(w, httpStatusFromError(err), err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) deletePuzzle(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id64, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 0)
	if err != nil || id64 == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}

	if err := h.service.Delete(r.Context(), uint(id64), user.ID); err != nil {
		httputil.WriteError(w, httpStatusFromError(err), err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *handler) mine(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	resp, err := h.service.ListMine(r.Context(), user.ID)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	var difficulty *int
	if d := q.Get("difficulty"); d != "" {
		v, err := strconv.Atoi(d)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid_difficulty")
			return
		}
		difficulty = &v
	}

	sort := q.Get("sort")
	page := atoiOrDefault(q.Get("page"), 1)
	pageSize := atoiOrDefault(q.Get("pageSize"), 20)

	var userID *uint
	if u := auth.UserFromContext(r.Context()); u != nil {
		userID = &u.ID
	}

	resp, err := h.service.List(r.Context(), ListRequest{
		Difficulty: difficulty,
		Sort:       sort,
		Page:       page,
		PageSize:   pageSize,
		UserID:     userID,
	})
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) get(w http.ResponseWriter, r *http.Request) {
	id64, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 0)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if id64 == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	id := uint(id64)

	var userID *uint
	if u := auth.UserFromContext(r.Context()); u != nil {
		userID = &u.ID
	}

	resp, err := h.service.Get(r.Context(), id, userID)
	if err != nil {
		httputil.WriteError(w, httpStatusFromError(err), err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) complete(w http.ResponseWriter, r *http.Request) {
	id64, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 0)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if id64 == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	id := uint(id64)

	var userID *uint
	var playerID *string
	if u := auth.UserFromContext(r.Context()); u != nil {
		userID = &u.ID
	} else {
		pid := r.Header.Get("X-Player-Id")
		if pid == "" {
			httputil.WriteError(w, http.StatusBadRequest, "missing_player_id")
			return
		}
		playerID = &pid
	}

	var req CompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
		return
	}

	resp, err := h.service.Complete(r.Context(), id, userID, playerID, req)
	if err != nil {
		httputil.WriteError(w, httpStatusFromError(err), err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) getProgress(w http.ResponseWriter, r *http.Request) {
	id64, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 0)
	if err != nil || id64 == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}

	user := auth.UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	resp, err := h.service.GetProgress(r.Context(), uint(id64), user.ID)
	if err != nil {
		httputil.WriteError(w, httpStatusFromError(err), err.Error())
		return
	}
	if resp == nil {
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"progress": nil})
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) saveProgress(w http.ResponseWriter, r *http.Request) {
	id64, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 0)
	if err != nil || id64 == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}

	user := auth.UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req SaveProgressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
		return
	}

	resp, err := h.service.SaveProgress(r.Context(), uint(id64), user.ID, req)
	if err != nil {
		httputil.WriteError(w, httpStatusFromError(err), err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) clearProgress(w http.ResponseWriter, r *http.Request) {
	id64, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 0)
	if err != nil || id64 == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_id")
		return
	}

	user := auth.UserFromContext(r.Context())
	if user == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := h.service.ClearProgress(r.Context(), uint(id64), user.ID); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *handler) hintStub(w http.ResponseWriter, _ *http.Request) {
	httputil.WriteJSON(w, http.StatusOK, HintResponse{
		Available: false,
		Reason:    "not_implemented",
	})
}

func (h *handler) optimizeStub(w http.ResponseWriter, _ *http.Request) {
	httputil.WriteJSON(w, http.StatusOK, OptimizeResponse{
		Available: false,
		Reason:    "not_implemented",
	})
}

func atoiOrDefault(s string, fallback int) int {
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return v
}
