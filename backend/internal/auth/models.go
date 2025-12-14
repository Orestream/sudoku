package auth

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"type:text;not null;uniqueIndex" json:"email"`
	DisplayName  *string   `gorm:"type:text" json:"displayName,omitempty"`
	PasswordHash *string   `gorm:"type:text" json:"-"`
	CreatedAt    time.Time `gorm:"not null" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"not null" json:"updatedAt"`
}

// UserIdentity is reserved for future OAuth providers (Google, etc.).
// For password auth, users will only have a PasswordHash.
type UserIdentity struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index;uniqueIndex:idx_provider_subject" json:"userId"`
	Provider  string    `gorm:"type:text;not null;uniqueIndex:idx_provider_subject" json:"provider"`
	Subject   string    `gorm:"type:text;not null;uniqueIndex:idx_provider_subject" json:"subject"`
	CreatedAt time.Time `gorm:"not null" json:"createdAt"`
}

type Session struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TokenHash string    `gorm:"type:char(64);not null;uniqueIndex" json:"-"`
	UserID    uint      `gorm:"not null;index" json:"userId"`
	ExpiresAt time.Time `gorm:"not null;index" json:"expiresAt"`
	CreatedAt time.Time `gorm:"not null" json:"createdAt"`
	LastSeen  time.Time `gorm:"not null" json:"lastSeen"`
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&User{}, &UserIdentity{}, &Session{})
}

