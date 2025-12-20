package puzzles

import (
	"context"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := AutoMigrate(db); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	return db
}

func TestComplete_AllowsNullPlayerIDForAuthenticatedUser(t *testing.T) {
	t.Parallel()

	db := newTestDB(t)
	svc := NewService(db)

	puzzle := Puzzle{
		Givens:                     strings.Repeat("0", 81),
		CreatorSuggestedDifficulty: 3,
		Published:                  true,
	}
	if err := db.Create(&puzzle).Error; err != nil {
		t.Fatalf("insert puzzle: %v", err)
	}

	userID := uint(42)
	liked := true
	resp, err := svc.Complete(context.Background(), puzzle.ID, &userID, nil, CompleteRequest{
		TimeMs:         1234,
		DifficultyVote: 5,
		Liked:          &liked,
	})
	if err != nil {
		t.Fatalf("complete: %v", err)
	}
	if !resp.OK {
		t.Fatalf("expected OK response")
	}

	var vote PuzzleVote
	if err := db.First(&vote).Error; err != nil {
		t.Fatalf("load vote: %v", err)
	}
	if vote.PlayerID != nil {
		t.Fatalf("expected player_id to be NULL for authenticated user, got %q", *vote.PlayerID)
	}
	if vote.UserID == nil || *vote.UserID != userID {
		t.Fatalf("expected user_id %d, got %#v", userID, vote.UserID)
	}
	if vote.DifficultyVote != 5 {
		t.Fatalf("difficulty vote mismatch: %d", vote.DifficultyVote)
	}
	if vote.Liked == nil || *vote.Liked != liked {
		t.Fatalf("liked mismatch: %#v", vote.Liked)
	}
}
