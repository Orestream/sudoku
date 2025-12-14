package puzzles

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"sudoku/backend/internal/httputil"
)

func NewHandler(service *Service) http.Handler {
	h := &handler{service: service}

	r := chi.NewRouter()
	r.Post("/validate", h.validate)
	r.Post("/optimize", h.optimizeStub)

	r.Post("/", h.create)
	r.Get("/", h.list)
	r.Get("/{id}", h.get)
	r.Post("/{id}/complete", h.complete)
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
	var req CreatePuzzleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
		return
	}

	resp, err := h.service.Create(r.Context(), req)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, resp)
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

	resp, err := h.service.List(r.Context(), ListRequest{
		Difficulty: difficulty,
		Sort:       sort,
		Page:       page,
		PageSize:   pageSize,
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

	resp, err := h.service.Get(r.Context(), id)
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

	playerID := r.Header.Get("X-Player-Id")
	if playerID == "" {
		httputil.WriteError(w, http.StatusBadRequest, "missing_player_id")
		return
	}

	var req CompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid_json")
		return
	}

	resp, err := h.service.Complete(r.Context(), id, playerID, req)
	if err != nil {
		httputil.WriteError(w, httpStatusFromError(err), err.Error())
		return
	}

	httputil.WriteJSON(w, http.StatusOK, resp)
}

func (h *handler) hintStub(w http.ResponseWriter, r *http.Request) {
	httputil.WriteJSON(w, http.StatusOK, HintResponse{
		Available: false,
		Reason:    "not_implemented",
	})
}

func (h *handler) optimizeStub(w http.ResponseWriter, r *http.Request) {
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
