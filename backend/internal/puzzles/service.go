package puzzles

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"sudoku/backend/internal/ranking"
	"sudoku/backend/internal/solver"
)

var (
	// ErrNotFound is returned when a puzzle is not found.
	ErrNotFound = errors.New("not_found")
)

// Service provides puzzle management functionality.
type Service struct {
	db *gorm.DB
}

// NewService creates a new puzzle service.
func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// ValidateRequest contains the request data for puzzle validation.
type ValidateRequest struct {
	Givens string `json:"givens"`
}

// ValidateResponse contains the result of puzzle validation.
type ValidateResponse struct {
	Valid         bool     `json:"valid"`
	Solvable      bool     `json:"solvable"`
	Unique        bool     `json:"unique"`
	SolutionCount int      `json:"solutionCount"`
	Errors        []string `json:"errors,omitempty"`
	Normalized    string   `json:"normalized,omitempty"`
}

// Validate validates a puzzle's givens and checks for uniqueness.
func (s *Service) Validate(_ context.Context, req ValidateRequest) (ValidateResponse, error) {
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

// CreatePuzzleRequest contains the data needed to create a puzzle.
type CreatePuzzleRequest struct {
	Title                      *string `json:"title"`
	Givens                     string  `json:"givens"`
	CreatorSuggestedDifficulty int     `json:"creatorSuggestedDifficulty"`
}

// CreatePuzzleResponse contains the ID of the created puzzle.
type CreatePuzzleResponse struct {
	ID uint `json:"id"`
}

// Create creates a new puzzle draft.
func (s *Service) Create(ctx context.Context, creatorUserID uint, req CreatePuzzleRequest) (CreatePuzzleResponse, error) {
	difficulty := req.CreatorSuggestedDifficulty
	if difficulty <= 0 {
		difficulty = 1
	}

	normalized := normalizeDraftGivens(req.Givens)

	title := normalizeTitle(req.Title)

	p := Puzzle{
		Title:                      title,
		Givens:                     normalized,
		CreatorSuggestedDifficulty: difficulty,
		CreatorUserID:              &creatorUserID,
		Published:                  false,
	}

	if err := s.db.WithContext(ctx).Create(&p).Error; err != nil {
		return CreatePuzzleResponse{}, errors.New("db_insert_failed")
	}

	return CreatePuzzleResponse{ID: p.ID}, nil
}

// UpdatePuzzleRequest contains the data needed to update a puzzle.
type UpdatePuzzleRequest struct {
	Title                      *string `json:"title"`
	Givens                     string  `json:"givens"`
	CreatorSuggestedDifficulty int     `json:"creatorSuggestedDifficulty"`
}

// Update updates an existing puzzle draft.
func (s *Service) Update(ctx context.Context, puzzleID uint, userID uint, req UpdatePuzzleRequest) (PuzzleDetail, error) {
	difficulty := req.CreatorSuggestedDifficulty
	if difficulty <= 0 {
		difficulty = 1
	}

	var puzzle Puzzle
	if err := s.db.WithContext(ctx).First(&puzzle, puzzleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return PuzzleDetail{}, ErrNotFound
		}
		return PuzzleDetail{}, errors.New("db_query_failed")
	}
	if puzzle.CreatorUserID == nil || *puzzle.CreatorUserID != userID {
		return PuzzleDetail{}, ErrNotFound
	}
	if puzzle.Published {
		return PuzzleDetail{}, errors.New("already_published")
	}

	puzzle.Title = normalizeTitle(req.Title)
	puzzle.Givens = normalizeDraftGivens(req.Givens)
	puzzle.CreatorSuggestedDifficulty = difficulty

	if err := s.db.WithContext(ctx).Save(&puzzle).Error; err != nil {
		return PuzzleDetail{}, errors.New("db_update_failed")
	}

	return s.Get(ctx, puzzleID, &userID)
}

// Publish publishes a puzzle draft.
func (s *Service) Publish(ctx context.Context, puzzleID uint, userID uint) (PuzzleDetail, error) {
	var puzzle Puzzle
	if err := s.db.WithContext(ctx).First(&puzzle, puzzleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return PuzzleDetail{}, ErrNotFound
		}
		return PuzzleDetail{}, errors.New("db_query_failed")
	}
	if puzzle.CreatorUserID == nil || *puzzle.CreatorUserID != userID {
		return PuzzleDetail{}, ErrNotFound
	}
	if puzzle.Published {
		return PuzzleDetail{}, errors.New("already_published")
	}

	if puzzle.CreatorSuggestedDifficulty <= 0 {
		puzzle.CreatorSuggestedDifficulty = 1
		_ = s.db.WithContext(ctx).Model(&puzzle).Update("creator_suggested_difficulty", 1)
	}

	normalized, grid, err := solver.ParseAndNormalize(puzzle.Givens)
	if err != nil {
		return PuzzleDetail{}, errors.New("invalid_givens")
	}
	count, err := solver.CountSolutions(grid, 2)
	if err != nil {
		return PuzzleDetail{}, errors.New("solve_failed")
	}
	if count != 1 {
		return PuzzleDetail{}, errors.New("puzzle_must_have_unique_solution")
	}

	puzzle.Givens = normalized
	puzzle.Published = true

	if err := s.db.WithContext(ctx).Save(&puzzle).Error; err != nil {
		return PuzzleDetail{}, errors.New("db_update_failed")
	}

	return s.Get(ctx, puzzleID, &userID)
}

// Delete deletes a puzzle draft.
func (s *Service) Delete(ctx context.Context, puzzleID uint, userID uint) error {
	var puzzle Puzzle
	if err := s.db.WithContext(ctx).Select("id", "creator_user_id", "published").First(&puzzle, puzzleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return errors.New("db_query_failed")
	}
	if puzzle.CreatorUserID == nil || *puzzle.CreatorUserID != userID {
		return ErrNotFound
	}
	if puzzle.Published {
		return errors.New("cannot_delete_published")
	}

	tx := s.db.WithContext(ctx).Begin()
	if err := tx.Where("puzzle_id = ?", puzzleID).Delete(&PuzzleVote{}).Error; err != nil {
		tx.Rollback()
		return errors.New("db_delete_failed")
	}
	if err := tx.Where("puzzle_id = ?", puzzleID).Delete(&PuzzleProgress{}).Error; err != nil {
		tx.Rollback()
		return errors.New("db_delete_failed")
	}
	if err := tx.Delete(&Puzzle{ID: puzzleID}).Error; err != nil {
		tx.Rollback()
		return errors.New("db_delete_failed")
	}
	if err := tx.Commit().Error; err != nil {
		return errors.New("db_delete_failed")
	}

	return nil
}

// ListRequest contains parameters for listing puzzles.
type ListRequest struct {
	Difficulty *int
	Sort       string
	Page       int
	PageSize   int
	UserID     *uint
}

// ProgressSummary represents puzzle completion progress.
type ProgressSummary struct {
	Filled  int `json:"filled"`
	Total   int `json:"total"`
	Percent int `json:"percent"`
}

// PuzzleSummary represents a summary of a puzzle.
type PuzzleSummary struct {
	ID                         uint             `json:"id"`
	Title                      *string          `json:"title,omitempty"`
	Givens                     string           `json:"givens"`
	CreatorSuggestedDifficulty int              `json:"creatorSuggestedDifficulty"`
	AggregatedDifficulty       int              `json:"aggregatedDifficulty"`
	Published                  bool             `json:"published"`
	Likes                      int              `json:"likes"`
	Dislikes                   int              `json:"dislikes"`
	CompletionCount            int              `json:"completionCount"`
	GoodnessRank               float64          `json:"goodnessRank"`
	CreatedAt                  time.Time        `json:"createdAt"`
	Progress                   *ProgressSummary `json:"progress,omitempty"`
	Solved                     *bool            `json:"solved,omitempty"`
}

// ListResponse contains the result of listing puzzles.
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
	Published                  bool
	CreatorUserID              *uint
	CreatedAt                  time.Time
	VoteCount                  int
	DifficultyAvg              *float64
	Likes                      int
	Dislikes                   int
}

// List returns a paginated list of puzzles.
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
			p.givens as givens,
			p.creator_suggested_difficulty as creator_suggested_difficulty,
			p.published as published,
			p.created_at as created_at,
			COUNT(v.id) as vote_count,
			AVG(v.difficulty_vote) as difficulty_avg,
			COALESCE(SUM(CASE WHEN v.liked = TRUE THEN 1 ELSE 0 END), 0) as likes,
			COALESCE(SUM(CASE WHEN v.liked = FALSE THEN 1 ELSE 0 END), 0) as dislikes
		`).
		Joins("LEFT JOIN puzzle_votes v ON v.puzzle_id = p.id").
		Where("p.published = TRUE").
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
			ID:                         row.ID,
			Title:                      row.Title,
			Givens:                     row.Givens,
			CreatorSuggestedDifficulty: row.CreatorSuggestedDifficulty,
			AggregatedDifficulty:       agg,
			Published:                  row.Published,
			Likes:                      row.Likes,
			Dislikes:                   row.Dislikes,
			CompletionCount:            row.VoteCount,
			GoodnessRank:               ranking.WilsonScore(row.Likes, row.Dislikes),
			CreatedAt:                  row.CreatedAt,
		})
	}

	sortMode := strings.TrimSpace(req.Sort)
	switch sortMode {
	case "", "top":
		sort.Slice(items, func(i, j int) bool {
			if items[i].GoodnessRank == items[j].GoodnessRank {
				return items[i].CreatedAt.After(items[j].CreatedAt)
			}
			return items[i].GoodnessRank > items[j].GoodnessRank
		})
	case "new":
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

	pageItems := items[start:end]

	if req.UserID != nil && len(pageItems) > 0 {
		ids := make([]uint, 0, len(pageItems))
		for _, it := range pageItems {
			ids = append(ids, it.ID)
		}
		var progressRows []PuzzleProgress
		if err := s.db.WithContext(ctx).
			Select("puzzle_id", "filled_count", "total_fillable_count").
			Where("user_id = ? AND puzzle_id IN ?", *req.UserID, ids).
			Find(&progressRows).Error; err == nil {
			progressByPuzzle := map[uint]ProgressSummary{}
			for _, pr := range progressRows {
				percent := 0
				if pr.TotalFillableCount > 0 {
					percent = int(math.Round(float64(pr.FilledCount) / float64(pr.TotalFillableCount) * 100))
					if percent < 0 {
						percent = 0
					}
					if percent > 100 {
						percent = 100
					}
				}
				progressByPuzzle[pr.PuzzleID] = ProgressSummary{
					Filled:  pr.FilledCount,
					Total:   pr.TotalFillableCount,
					Percent: percent,
				}
			}
			for i := range pageItems {
				if ps, ok := progressByPuzzle[pageItems[i].ID]; ok {
					pageItems[i].Progress = &ps
				}
			}
		}

		type voteRow struct {
			PuzzleID uint
		}
		var voteRows []voteRow
		if err := s.db.WithContext(ctx).
			Table("puzzle_votes").
			Select("puzzle_id").
			Where("user_id = ? AND puzzle_id IN ?", *req.UserID, ids).
			Scan(&voteRows).Error; err == nil {
			solvedSet := map[uint]bool{}
			for _, vr := range voteRows {
				solvedSet[vr.PuzzleID] = true
			}
			for i := range pageItems {
				v := solvedSet[pageItems[i].ID]
				pageItems[i].Solved = boolPtr(v)
			}
		}
	}

	return ListResponse{
		Items:    pageItems,
		Page:     req.Page,
		PageSize: req.PageSize,
		Total:    total,
	}, nil
}

// PuzzleDetail contains detailed information about a puzzle.
type PuzzleDetail struct {
	ID                         uint      `json:"id"`
	Title                      *string   `json:"title,omitempty"`
	Givens                     string    `json:"givens"`
	CreatorSuggestedDifficulty int       `json:"creatorSuggestedDifficulty"`
	AggregatedDifficulty       int       `json:"aggregatedDifficulty"`
	Published                  bool      `json:"published"`
	Likes                      int       `json:"likes"`
	Dislikes                   int       `json:"dislikes"`
	CompletionCount            int       `json:"completionCount"`
	GoodnessRank               float64   `json:"goodnessRank"`
	CreatedAt                  time.Time `json:"createdAt"`
}

// Get retrieves a puzzle by ID.
func (s *Service) Get(ctx context.Context, id uint, userID *uint) (PuzzleDetail, error) {
	var row puzzleStatsRow
	err := s.db.WithContext(ctx).
		Table("puzzles p").
		Select(`
			p.id as id,
			p.title as title,
			p.givens as givens,
			p.creator_suggested_difficulty as creator_suggested_difficulty,
			p.creator_user_id as creator_user_id,
			p.published as published,
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
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return PuzzleDetail{}, ErrNotFound
		}
		return PuzzleDetail{}, errors.New("db_query_failed")
	}

	if row.ID == 0 {
		return PuzzleDetail{}, ErrNotFound
	}

	if !row.Published {
		if row.CreatorUserID == nil || userID == nil || *row.CreatorUserID != *userID {
			return PuzzleDetail{}, ErrNotFound
		}
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
		Published:                  row.Published,
		Likes:                      row.Likes,
		Dislikes:                   row.Dislikes,
		CompletionCount:            row.VoteCount,
		GoodnessRank:               ranking.WilsonScore(row.Likes, row.Dislikes),
		CreatedAt:                  row.CreatedAt,
	}, nil
}

// CompleteRequest contains the data for completing a puzzle.
type CompleteRequest struct {
	TimeMs         int   `json:"timeMs"`
	DifficultyVote int   `json:"difficultyVote"`
	Liked          *bool `json:"liked"`
}

// CompleteResponse contains the result of completing a puzzle.
type CompleteResponse struct {
	OK bool `json:"ok"`
}

// Complete records a puzzle completion.
func (s *Service) Complete(ctx context.Context, puzzleID uint, userID *uint, playerID *string, req CompleteRequest) (CompleteResponse, error) {
	if userID == nil && (playerID == nil || *playerID == "") {
		return CompleteResponse{}, errors.New("missing_player_id")
	}
	if req.TimeMs < 0 {
		return CompleteResponse{}, errors.New("invalid_time_ms")
	}
	if req.DifficultyVote <= 0 {
		return CompleteResponse{}, errors.New("invalid_difficulty_vote")
	}

	var puzzle Puzzle
	if err := s.db.WithContext(ctx).Select("id", "creator_user_id", "published").First(&puzzle, puzzleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return CompleteResponse{}, ErrNotFound
		}
		return CompleteResponse{}, errors.New("db_query_failed")
	}

	if !puzzle.Published {
		if puzzle.CreatorUserID == nil || userID == nil || *puzzle.CreatorUserID != *userID {
			return CompleteResponse{}, ErrNotFound
		}
		_ = s.db.WithContext(ctx).Where("user_id = ? AND puzzle_id = ?", *userID, puzzleID).Delete(&PuzzleProgress{}).Error
		return CompleteResponse{OK: true}, nil
	}

	vote := PuzzleVote{
		PuzzleID:       puzzleID,
		PlayerID:       playerID,
		UserID:         userID,
		DifficultyVote: req.DifficultyVote,
		Liked:          req.Liked,
		CompletedAt:    time.Now().UTC(),
		TimeMs:         req.TimeMs,
	}

	var conflictCols []clause.Column
	if userID != nil {
		vote.PlayerID = nil
		conflictCols = []clause.Column{{Name: "puzzle_id"}, {Name: "user_id"}}
	} else {
		conflictCols = []clause.Column{{Name: "puzzle_id"}, {Name: "player_id"}}
	}

	err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   conflictCols,
			DoUpdates: clause.AssignmentColumns([]string{"difficulty_vote", "liked", "completed_at", "time_ms"}),
		}).
		Create(&vote).Error
	if err != nil {
		return CompleteResponse{}, errors.New("db_insert_failed")
	}

	if userID != nil {
		_ = s.db.WithContext(ctx).Where("user_id = ? AND puzzle_id = ?", *userID, puzzleID).Delete(&PuzzleProgress{}).Error
	}

	return CompleteResponse{OK: true}, nil
}

// HintResponse contains the response for hint requests.
type HintResponse struct {
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
}

// OptimizeResponse contains the response for optimization requests.
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

func boolPtr(v bool) *bool {
	b := v
	return &b
}

func normalizeTitle(raw *string) *string {
	if raw == nil {
		return nil
	}
	t := strings.TrimSpace(*raw)
	if t == "" {
		return nil
	}
	return &t
}

func normalizeDraftGivens(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return strings.Repeat("0", 81)
	}

	var b strings.Builder
	b.Grow(81)
	count := 0
	for i := 0; i < len(s) && count < 81; i++ {
		ch := s[i]
		switch {
		case ch >= '0' && ch <= '9':
			b.WriteByte(ch)
			count++
		case ch == '.':
			b.WriteByte('0')
			count++
		default:
			// skip
		}
	}
	for count < 81 {
		b.WriteByte('0')
		count++
	}
	return b.String()
}

// MyPuzzlesResponse contains the list of puzzles created by a user.
type MyPuzzlesResponse struct {
	Items []PuzzleSummary `json:"items"`
}

// ListMine returns all puzzles created by a user.
func (s *Service) ListMine(ctx context.Context, userID uint) (MyPuzzlesResponse, error) {
	var rows []puzzleStatsRow
	if err := s.db.WithContext(ctx).
		Table("puzzles p").
		Select(`
			p.id as id,
			p.title as title,
			p.givens as givens,
			p.creator_suggested_difficulty as creator_suggested_difficulty,
			p.creator_user_id as creator_user_id,
			p.published as published,
			p.created_at as created_at,
			COUNT(v.id) as vote_count,
			AVG(v.difficulty_vote) as difficulty_avg,
			COALESCE(SUM(CASE WHEN v.liked = TRUE THEN 1 ELSE 0 END), 0) as likes,
			COALESCE(SUM(CASE WHEN v.liked = FALSE THEN 1 ELSE 0 END), 0) as dislikes
		`).
		Joins("LEFT JOIN puzzle_votes v ON v.puzzle_id = p.id").
		Where("p.creator_user_id = ?", userID).
		Group("p.id").
		Order("p.created_at DESC").
		Scan(&rows).Error; err != nil {
		return MyPuzzlesResponse{}, errors.New("db_query_failed")
	}

	items := make([]PuzzleSummary, 0, len(rows))
	for _, p := range rows {
		agg := p.CreatorSuggestedDifficulty
		if p.DifficultyAvg != nil && !math.IsNaN(*p.DifficultyAvg) {
			agg = int(math.Round(*p.DifficultyAvg))
			if agg <= 0 {
				agg = p.CreatorSuggestedDifficulty
			}
		}

		items = append(items, PuzzleSummary{
			ID:                         p.ID,
			Title:                      p.Title,
			Givens:                     p.Givens,
			CreatorSuggestedDifficulty: p.CreatorSuggestedDifficulty,
			AggregatedDifficulty:       agg,
			Published:                  p.Published,
			Likes:                      p.Likes,
			Dislikes:                   p.Dislikes,
			CompletionCount:            p.VoteCount,
			GoodnessRank:               ranking.WilsonScore(p.Likes, p.Dislikes),
			CreatedAt:                  p.CreatedAt,
		})
	}

	return MyPuzzlesResponse{Items: items}, nil
}

// SaveProgressRequest contains the data for saving puzzle progress.
type SaveProgressRequest struct {
	Values      string `json:"values"`
	CornerNotes []int  `json:"cornerNotes"`
	CenterNotes []int  `json:"centerNotes"`
}

// ProgressResponse contains puzzle progress information.
type ProgressResponse struct {
	Values      string          `json:"values"`
	CornerNotes []int           `json:"cornerNotes"`
	CenterNotes []int           `json:"centerNotes"`
	Progress    ProgressSummary `json:"progress"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

// GetProgress retrieves puzzle progress for a user.
func (s *Service) GetProgress(ctx context.Context, puzzleID uint, userID uint) (*ProgressResponse, error) {
	var puzzle Puzzle
	if err := s.db.WithContext(ctx).Select("id", "creator_user_id", "published").First(&puzzle, puzzleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, errors.New("db_query_failed")
	}
	if !puzzle.Published && (puzzle.CreatorUserID == nil || *puzzle.CreatorUserID != userID) {
		return nil, ErrNotFound
	}

	var pr PuzzleProgress
	if err := s.db.WithContext(ctx).Where("puzzle_id = ? AND user_id = ?", puzzleID, userID).First(&pr).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, errors.New("db_query_failed")
	}

	var corner []int
	var center []int
	_ = json.Unmarshal(pr.CornerNotes, &corner)
	_ = json.Unmarshal(pr.CenterNotes, &center)

	percent := 0
	if pr.TotalFillableCount > 0 {
		percent = int(math.Round(float64(pr.FilledCount) / float64(pr.TotalFillableCount) * 100))
		if percent < 0 {
			percent = 0
		}
		if percent > 100 {
			percent = 100
		}
	}

	return &ProgressResponse{
		Values:      pr.Values,
		CornerNotes: corner,
		CenterNotes: center,
		Progress: ProgressSummary{
			Filled:  pr.FilledCount,
			Total:   pr.TotalFillableCount,
			Percent: percent,
		},
		UpdatedAt: pr.UpdatedAt,
	}, nil
}

// SaveProgress saves puzzle progress for a user.
func (s *Service) SaveProgress(ctx context.Context, puzzleID uint, userID uint, req SaveProgressRequest) (ProgressResponse, error) {
	var puzzle Puzzle
	if err := s.db.WithContext(ctx).Select("id", "givens", "creator_user_id", "published").First(&puzzle, puzzleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ProgressResponse{}, ErrNotFound
		}
		return ProgressResponse{}, errors.New("db_query_failed")
	}
	if !puzzle.Published && (puzzle.CreatorUserID == nil || *puzzle.CreatorUserID != userID) {
		return ProgressResponse{}, ErrNotFound
	}

	values, filled, total, err := normalizeValuesAgainstGivens(puzzle.Givens, req.Values)
	if err != nil {
		return ProgressResponse{}, err
	}

	cornerNotes, err := normalizeNotes(req.CornerNotes, puzzle.Givens)
	if err != nil {
		return ProgressResponse{}, err
	}
	centerNotes, err := normalizeNotes(req.CenterNotes, puzzle.Givens)
	if err != nil {
		return ProgressResponse{}, err
	}

	notesEmpty := true
	for i := 0; i < 81; i++ {
		if (cornerNotes[i] | centerNotes[i]) != 0 {
			notesEmpty = false
			break
		}
	}

	// If there is no progress at all, delete the row (so the play list doesn't show 0%).
	if filled == 0 && notesEmpty {
		_ = s.db.WithContext(ctx).Where("puzzle_id = ? AND user_id = ?", puzzleID, userID).Delete(&PuzzleProgress{}).Error
		return ProgressResponse{
			Values:      values,
			CornerNotes: cornerNotes,
			CenterNotes: centerNotes,
			Progress: ProgressSummary{
				Filled:  0,
				Total:   total,
				Percent: 0,
			},
			UpdatedAt: time.Now().UTC(),
		}, nil
	}

	cornerJSON, _ := json.Marshal(cornerNotes)
	centerJSON, _ := json.Marshal(centerNotes)

	progress := PuzzleProgress{
		PuzzleID:           puzzleID,
		UserID:             userID,
		Values:             values,
		CornerNotes:        cornerJSON,
		CenterNotes:        centerJSON,
		FilledCount:        filled,
		TotalFillableCount: total,
	}

	err = s.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "puzzle_id"}, {Name: "user_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"values",
				"corner_notes",
				"center_notes",
				"filled_count",
				"total_fillable_count",
				"updated_at",
			}),
		}).
		Create(&progress).Error
	if err != nil {
		return ProgressResponse{}, errors.New("db_insert_failed")
	}

	percent := 0
	if total > 0 {
		percent = int(math.Round(float64(filled) / float64(total) * 100))
		if percent < 0 {
			percent = 0
		}
		if percent > 100 {
			percent = 100
		}
	}

	return ProgressResponse{
		Values:      values,
		CornerNotes: cornerNotes,
		CenterNotes: centerNotes,
		Progress: ProgressSummary{
			Filled:  filled,
			Total:   total,
			Percent: percent,
		},
		UpdatedAt: time.Now().UTC(),
	}, nil
}

// ClearProgress clears puzzle progress for a user.
func (s *Service) ClearProgress(ctx context.Context, puzzleID uint, userID uint) error {
	var puzzle Puzzle
	if err := s.db.WithContext(ctx).Select("id", "creator_user_id", "published").First(&puzzle, puzzleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return errors.New("db_query_failed")
	}
	if !puzzle.Published && (puzzle.CreatorUserID == nil || *puzzle.CreatorUserID != userID) {
		return ErrNotFound
	}

	if err := s.db.WithContext(ctx).Where("puzzle_id = ? AND user_id = ?", puzzleID, userID).Delete(&PuzzleProgress{}).Error; err != nil {
		return errors.New("db_delete_failed")
	}
	return nil
}

func normalizeValuesAgainstGivens(givens string, values string) (string, int, int, error) {
	if len(givens) != 81 {
		return "", 0, 0, errors.New("invalid_givens")
	}
	if len(values) != 81 {
		return "", 0, 0, errors.New("invalid_values")
	}

	total := 0
	filled := 0
	out := make([]byte, 81)
	for i := 0; i < 81; i++ {
		g := givens[i]
		v := values[i]

		if g < '0' || g > '9' {
			return "", 0, 0, errors.New("invalid_givens")
		}
		if v < '0' || v > '9' {
			return "", 0, 0, errors.New("invalid_values")
		}

		if g != '0' {
			out[i] = g
			continue
		}

		total++
		out[i] = v
		if v != '0' {
			filled++
		}
	}

	return string(out), filled, total, nil
}

func normalizeNotes(notes []int, givens string) ([]int, error) {
	if len(notes) != 81 {
		return nil, errors.New("invalid_notes")
	}
	if len(givens) != 81 {
		return nil, errors.New("invalid_givens")
	}

	out := make([]int, 81)
	for i := 0; i < 81; i++ {
		g := givens[i]
		if g != '0' {
			out[i] = 0
			continue
		}
		v := notes[i]
		if v < 0 || v > 0b111111111 {
			return nil, errors.New("invalid_notes")
		}
		out[i] = v
	}
	return out, nil
}

// valuesFromGridInts converts a grid of integers to a string representation.
// Intentionally used only by tests / debugging helpers where a stable string is needed.
// This function is intentionally unused in production code.
//
//nolint:unused // Intentionally kept for test/debugging purposes
func valuesFromGridInts(values []int) (string, error) {
	if len(values) != 81 {
		return "", errors.New("invalid_values")
	}
	var b strings.Builder
	b.Grow(81)
	for _, v := range values {
		if v < 0 || v > 9 {
			return "", errors.New("invalid_values")
		}
		b.WriteString(strconv.Itoa(v))
	}
	return b.String(), nil
}
