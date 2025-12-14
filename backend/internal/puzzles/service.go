package puzzles

import (
	"context"
	"errors"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"sudoku/backend/internal/ranking"
	"sudoku/backend/internal/solver"
)

var (
	ErrNotFound = errors.New("not_found")
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

type ValidateRequest struct {
	Givens string `json:"givens"`
}

type ValidateResponse struct {
	Valid         bool     `json:"valid"`
	Solvable      bool     `json:"solvable"`
	Unique        bool     `json:"unique"`
	SolutionCount int      `json:"solutionCount"`
	Errors        []string `json:"errors,omitempty"`
	Normalized    string   `json:"normalized,omitempty"`
}

func (s *Service) Validate(ctx context.Context, req ValidateRequest) (ValidateResponse, error) {
	normalized, grid, err := solver.ParseAndNormalize(req.Givens)
	if err != nil {
		return ValidateResponse{Valid: false, Errors: []string{err.Error()}}, nil
	}

	count, err := solver.CountSolutions(grid, 2)
	if err != nil {
		return ValidateResponse{Valid: false, Errors: []string{"solve_failed"}}, nil
	}

	return ValidateResponse{
		Valid:         true,
		Solvable:      count > 0,
		Unique:        count == 1,
		SolutionCount: count,
		Normalized:    normalized,
	}, nil
}

type CreatePuzzleRequest struct {
	Title                      *string `json:"title"`
	Givens                     string  `json:"givens"`
	CreatorSuggestedDifficulty int     `json:"creatorSuggestedDifficulty"`
}

type CreatePuzzleResponse struct {
	ID uint `json:"id"`
}

func (s *Service) Create(ctx context.Context, req CreatePuzzleRequest) (CreatePuzzleResponse, error) {
	if req.CreatorSuggestedDifficulty <= 0 {
		return CreatePuzzleResponse{}, errors.New("invalid_creator_suggested_difficulty")
	}

	normalized, grid, err := solver.ParseAndNormalize(req.Givens)
	if err != nil {
		return CreatePuzzleResponse{}, errors.New("invalid_givens")
	}

	count, err := solver.CountSolutions(grid, 2)
	if err != nil {
		return CreatePuzzleResponse{}, errors.New("solve_failed")
	}
	if count != 1 {
		return CreatePuzzleResponse{}, errors.New("puzzle_must_have_unique_solution")
	}

	var title *string
	if req.Title != nil {
		t := strings.TrimSpace(*req.Title)
		if t != "" {
			title = &t
		}
	}

	p := Puzzle{
		Title:                      title,
		Givens:                     normalized,
		CreatorSuggestedDifficulty: req.CreatorSuggestedDifficulty,
	}

	if err := s.db.WithContext(ctx).Create(&p).Error; err != nil {
		return CreatePuzzleResponse{}, errors.New("db_insert_failed")
	}

	return CreatePuzzleResponse{ID: p.ID}, nil
}

type ListRequest struct {
	Difficulty *int
	Sort       string
	Page       int
	PageSize   int
}

type PuzzleSummary struct {
	ID                   uint      `json:"id"`
	Title                *string   `json:"title,omitempty"`
	CreatorDifficulty    int       `json:"creatorSuggestedDifficulty"`
	AggregatedDifficulty int       `json:"aggregatedDifficulty"`
	Likes                int       `json:"likes"`
	Dislikes             int       `json:"dislikes"`
	CompletionCount      int       `json:"completionCount"`
	GoodnessRank         float64   `json:"goodnessRank"`
	CreatedAt            time.Time `json:"createdAt"`
}

type ListResponse struct {
	Items    []PuzzleSummary `json:"items"`
	Page     int             `json:"page"`
	PageSize int             `json:"pageSize"`
	Total    int             `json:"total"`
}

type puzzleStatsRow struct {
	ID                         uint
	Title                      *string
	Givens                     string
	CreatorSuggestedDifficulty int
	CreatedAt                  time.Time
	VoteCount                  int
	DifficultyAvg              *float64
	Likes                      int
	Dislikes                   int
}

func (s *Service) List(ctx context.Context, req ListRequest) (ListResponse, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 || req.PageSize > 100 {
		req.PageSize = 20
	}

	var rows []puzzleStatsRow
	err := s.db.WithContext(ctx).
		Table("puzzles p").
		Select(`
			p.id as id,
			p.title as title,
			p.creator_suggested_difficulty as creator_suggested_difficulty,
			p.created_at as created_at,
			COUNT(v.id) as vote_count,
			AVG(v.difficulty_vote) as difficulty_avg,
			COALESCE(SUM(CASE WHEN v.liked = TRUE THEN 1 ELSE 0 END), 0) as likes,
			COALESCE(SUM(CASE WHEN v.liked = FALSE THEN 1 ELSE 0 END), 0) as dislikes
		`).
		Joins("LEFT JOIN puzzle_votes v ON v.puzzle_id = p.id").
		Group("p.id").
		Scan(&rows).Error
	if err != nil {
		return ListResponse{}, errors.New("db_query_failed")
	}

	items := make([]PuzzleSummary, 0, len(rows))
	for _, row := range rows {
		agg := row.CreatorSuggestedDifficulty
		if row.DifficultyAvg != nil && !math.IsNaN(*row.DifficultyAvg) {
			agg = int(math.Round(*row.DifficultyAvg))
			if agg <= 0 {
				agg = row.CreatorSuggestedDifficulty
			}
		}

		if req.Difficulty != nil && agg != *req.Difficulty {
			continue
		}

		items = append(items, PuzzleSummary{
			ID:                   row.ID,
			Title:                row.Title,
			CreatorDifficulty:    row.CreatorSuggestedDifficulty,
			AggregatedDifficulty: agg,
			Likes:                row.Likes,
			Dislikes:             row.Dislikes,
			CompletionCount:      row.VoteCount,
			GoodnessRank:         ranking.WilsonScore(row.Likes, row.Dislikes),
			CreatedAt:            row.CreatedAt,
		})
	}

	sortMode := strings.TrimSpace(req.Sort)
	if sortMode == "" || sortMode == "top" {
		sort.Slice(items, func(i, j int) bool {
			if items[i].GoodnessRank == items[j].GoodnessRank {
				return items[i].CreatedAt.After(items[j].CreatedAt)
			}
			return items[i].GoodnessRank > items[j].GoodnessRank
		})
	} else if sortMode == "new" {
		sort.Slice(items, func(i, j int) bool {
			return items[i].CreatedAt.After(items[j].CreatedAt)
		})
	}

	total := len(items)
	start := (req.Page - 1) * req.PageSize
	if start > total {
		start = total
	}
	end := start + req.PageSize
	if end > total {
		end = total
	}

	return ListResponse{
		Items:    items[start:end],
		Page:     req.Page,
		PageSize: req.PageSize,
		Total:    total,
	}, nil
}

type PuzzleDetail struct {
	ID                         uint      `json:"id"`
	Title                      *string   `json:"title,omitempty"`
	Givens                     string    `json:"givens"`
	CreatorSuggestedDifficulty int       `json:"creatorSuggestedDifficulty"`
	AggregatedDifficulty       int       `json:"aggregatedDifficulty"`
	Likes                      int       `json:"likes"`
	Dislikes                   int       `json:"dislikes"`
	CompletionCount            int       `json:"completionCount"`
	GoodnessRank               float64   `json:"goodnessRank"`
	CreatedAt                  time.Time `json:"createdAt"`
}

func (s *Service) Get(ctx context.Context, id uint) (PuzzleDetail, error) {
	var puzzle Puzzle
	if err := s.db.WithContext(ctx).First(&puzzle, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return PuzzleDetail{}, ErrNotFound
		}
		return PuzzleDetail{}, errors.New("db_query_failed")
	}

	var row puzzleStatsRow
	err := s.db.WithContext(ctx).
		Table("puzzles p").
		Select(`
			p.id as id,
			p.title as title,
			p.givens as givens,
			p.creator_suggested_difficulty as creator_suggested_difficulty,
			p.created_at as created_at,
			COUNT(v.id) as vote_count,
			AVG(v.difficulty_vote) as difficulty_avg,
			COALESCE(SUM(CASE WHEN v.liked = TRUE THEN 1 ELSE 0 END), 0) as likes,
			COALESCE(SUM(CASE WHEN v.liked = FALSE THEN 1 ELSE 0 END), 0) as dislikes
		`).
		Joins("LEFT JOIN puzzle_votes v ON v.puzzle_id = p.id").
		Where("p.id = ?", id).
		Group("p.id").
		Scan(&row).Error
	if err != nil {
		return PuzzleDetail{}, errors.New("db_query_failed")
	}

	agg := row.CreatorSuggestedDifficulty
	if row.DifficultyAvg != nil && !math.IsNaN(*row.DifficultyAvg) {
		agg = int(math.Round(*row.DifficultyAvg))
		if agg <= 0 {
			agg = row.CreatorSuggestedDifficulty
		}
	}

	return PuzzleDetail{
		ID:                         row.ID,
		Title:                      row.Title,
		Givens:                     row.Givens,
		CreatorSuggestedDifficulty: row.CreatorSuggestedDifficulty,
		AggregatedDifficulty:       agg,
		Likes:                      row.Likes,
		Dislikes:                   row.Dislikes,
		CompletionCount:            row.VoteCount,
		GoodnessRank:               ranking.WilsonScore(row.Likes, row.Dislikes),
		CreatedAt:                  row.CreatedAt,
	}, nil
}

type CompleteRequest struct {
	TimeMs         int   `json:"timeMs"`
	DifficultyVote int   `json:"difficultyVote"`
	Liked          *bool `json:"liked"`
}

type CompleteResponse struct {
	OK bool `json:"ok"`
}

func (s *Service) Complete(ctx context.Context, puzzleID uint, playerID string, req CompleteRequest) (CompleteResponse, error) {
	if playerID == "" {
		return CompleteResponse{}, errors.New("missing_player_id")
	}
	if req.TimeMs < 0 {
		return CompleteResponse{}, errors.New("invalid_time_ms")
	}
	if req.DifficultyVote <= 0 {
		return CompleteResponse{}, errors.New("invalid_difficulty_vote")
	}

	var puzzle Puzzle
	if err := s.db.WithContext(ctx).Select("id").First(&puzzle, puzzleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return CompleteResponse{}, ErrNotFound
		}
		return CompleteResponse{}, errors.New("db_query_failed")
	}

	vote := PuzzleVote{
		PuzzleID:       puzzleID,
		PlayerID:       playerID,
		DifficultyVote: req.DifficultyVote,
		Liked:          req.Liked,
		CompletedAt:    time.Now().UTC(),
		TimeMs:         req.TimeMs,
	}

	err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "puzzle_id"}, {Name: "player_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"difficulty_vote", "liked", "completed_at", "time_ms"}),
		}).
		Create(&vote).Error
	if err != nil {
		return CompleteResponse{}, errors.New("db_insert_failed")
	}

	return CompleteResponse{OK: true}, nil
}

type HintResponse struct {
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
}

type OptimizeResponse struct {
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
}

func httpStatusFromError(err error) int {
	if errors.Is(err, ErrNotFound) {
		return http.StatusNotFound
	}
	return http.StatusBadRequest
}
