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
	CreatedAt                  time.Time `gorm:"not null" json:"createdAt"`
}

type PuzzleVote struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	PuzzleID       uint      `gorm:"not null;index;uniqueIndex:idx_puzzle_player" json:"puzzleId"`
	PlayerID       string    `gorm:"type:text;not null;uniqueIndex:idx_puzzle_player" json:"playerId"`
	DifficultyVote int       `gorm:"not null" json:"difficultyVote"`
	Liked          *bool     `json:"liked,omitempty"`
	CompletedAt    time.Time `gorm:"not null" json:"completedAt"`
	TimeMs         int       `gorm:"not null" json:"timeMs"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&Puzzle{}, &PuzzleVote{})
}
