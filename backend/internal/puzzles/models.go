package puzzles

import (
	"time"

	"gorm.io/gorm"
)

type Puzzle struct {
	ID                         uint      `gorm:"primaryKey" json:"id"`
	Title                      *string   `gorm:"type:text" json:"title,omitempty"`
	Givens                     string    `gorm:"not null" json:"givens"`
	CreatorSuggestedDifficulty int       `gorm:"not null" json:"creatorSuggestedDifficulty"`
	CreatorUserID              *uint     `gorm:"index" json:"creatorUserId,omitempty"`
	CreatedAt                  time.Time `gorm:"not null" json:"createdAt"`
}

type PuzzleVote struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	PuzzleID       uint      `gorm:"not null;index;uniqueIndex:idx_puzzle_player;uniqueIndex:idx_puzzle_user" json:"puzzleId"`
	PlayerID       *string   `gorm:"type:text;uniqueIndex:idx_puzzle_player" json:"playerId,omitempty"`
	UserID         *uint     `gorm:"index;uniqueIndex:idx_puzzle_user" json:"userId,omitempty"`
	DifficultyVote int       `gorm:"not null" json:"difficultyVote"`
	Liked          *bool     `json:"liked,omitempty"`
	CompletedAt    time.Time `gorm:"not null" json:"completedAt"`
	TimeMs         int       `gorm:"not null" json:"timeMs"`
}

type PuzzleProgress struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	PuzzleID           uint           `gorm:"not null;index;uniqueIndex:idx_progress" json:"puzzleId"`
	UserID             uint           `gorm:"not null;index;uniqueIndex:idx_progress" json:"userId"`
	Values             string         `gorm:"type:char(81);not null" json:"values"`
	CornerNotes        []byte         `gorm:"type:jsonb;not null" json:"cornerNotes"`
	CenterNotes        []byte         `gorm:"type:jsonb;not null" json:"centerNotes"`
	FilledCount        int            `gorm:"not null" json:"filledCount"`
	TotalFillableCount int            `gorm:"not null" json:"totalFillableCount"`
	CreatedAt          time.Time      `gorm:"not null" json:"createdAt"`
	UpdatedAt          time.Time      `gorm:"not null" json:"updatedAt"`
}

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(&Puzzle{}, &PuzzleVote{}, &PuzzleProgress{}); err != nil {
		return err
	}

	// Legacy fix: older versions accidentally created `idx_puzzle_user` as unique(user_id),
	// which breaks the (puzzle_id, user_id) ON CONFLICT upsert and prevents multiple votes.
	if err := db.Exec(`DROP INDEX IF EXISTS idx_puzzle_user`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		WITH ranked AS (
			SELECT
				id,
				ROW_NUMBER() OVER (
					PARTITION BY puzzle_id, user_id
					ORDER BY completed_at DESC, id DESC
				) AS rn
			FROM puzzle_votes
			WHERE user_id IS NOT NULL
		)
		DELETE FROM puzzle_votes
		WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_puzzle_user ON puzzle_votes (puzzle_id, user_id)`).Error; err != nil {
		return err
	}

	return nil
}
