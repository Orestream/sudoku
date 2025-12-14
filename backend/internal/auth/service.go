package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrConflict     = errors.New("conflict")
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

type PublicUser struct {
	ID          uint    `json:"id"`
	Email       string  `json:"email"`
	DisplayName *string `json:"displayName,omitempty"`
}

func toPublicUser(u User) PublicUser {
	return PublicUser{
		ID:          u.ID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
	}
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func (s *Service) Register(ctx context.Context, email string, password string, displayName *string) (PublicUser, error) {
	email = normalizeEmail(email)
	if email == "" || !strings.Contains(email, "@") {
		return PublicUser{}, errors.New("invalid_email")
	}
	if len(password) < 8 {
		return PublicUser{}, errors.New("password_too_short")
	}

	pwHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return PublicUser{}, errors.New("password_hash_failed")
	}
	hash := string(pwHash)

	var name *string
	if displayName != nil {
		v := strings.TrimSpace(*displayName)
		if v != "" {
			name = &v
		}
	}

	u := User{
		Email:        email,
		DisplayName:  name,
		PasswordHash: &hash,
	}
	if err := s.db.WithContext(ctx).Create(&u).Error; err != nil {
		// best-effort conflict detect: unique email
		return PublicUser{}, ErrConflict
	}

	return toPublicUser(u), nil
}

func (s *Service) Authenticate(ctx context.Context, email string, password string) (User, error) {
	email = normalizeEmail(email)
	if email == "" || password == "" {
		return User{}, ErrUnauthorized
	}

	var u User
	if err := s.db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return User{}, ErrUnauthorized
		}
		return User{}, errors.New("db_query_failed")
	}
	if u.PasswordHash == nil || *u.PasswordHash == "" {
		return User{}, ErrUnauthorized
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*u.PasswordHash), []byte(password)); err != nil {
		return User{}, ErrUnauthorized
	}

	return u, nil
}

const (
	cookieName       = "sudoku_session"
	sessionTokenSize = 32
	sessionLifetime  = 30 * 24 * time.Hour
)

func CookieName() string {
	return cookieName
}

func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func generateToken() (string, error) {
	b := make([]byte, sessionTokenSize)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (s *Service) CreateSession(ctx context.Context, userID uint) (token string, expiresAt time.Time, err error) {
	token, err = generateToken()
	if err != nil {
		return "", time.Time{}, errors.New("token_generate_failed")
	}

	now := time.Now().UTC()
	expiresAt = now.Add(sessionLifetime)

	sess := Session{
		TokenHash: tokenHash(token),
		UserID:    userID,
		ExpiresAt: expiresAt,
		CreatedAt: now,
		LastSeen:  now,
	}
	if err := s.db.WithContext(ctx).Create(&sess).Error; err != nil {
		return "", time.Time{}, errors.New("db_insert_failed")
	}

	return token, expiresAt, nil
}

func (s *Service) DeleteSession(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	if err := s.db.WithContext(ctx).Where("token_hash = ?", tokenHash(token)).Delete(&Session{}).Error; err != nil {
		return errors.New("db_delete_failed")
	}
	return nil
}

func (s *Service) UserFromSession(ctx context.Context, token string) (*User, error) {
	if token == "" {
		return nil, nil
	}

	var sess Session
	if err := s.db.WithContext(ctx).Where("token_hash = ?", tokenHash(token)).First(&sess).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, errors.New("db_query_failed")
	}
	if time.Now().UTC().After(sess.ExpiresAt) {
		_ = s.DeleteSession(ctx, token)
		return nil, nil
	}

	_ = s.db.WithContext(ctx).Model(&Session{}).Where("id = ?", sess.ID).Update("last_seen", time.Now().UTC()).Error

	var u User
	if err := s.db.WithContext(ctx).First(&u, sess.UserID).Error; err != nil {
		return nil, errors.New("db_query_failed")
	}
	return &u, nil
}

type Stats struct {
	SolvedCount    int `json:"solvedCount"`
	CreatedCount   int `json:"createdCount"`
	InProgressCount int `json:"inProgressCount"`
}

func (s *Service) Stats(ctx context.Context, userID uint) (Stats, error) {
	var solved int64
	if err := s.db.WithContext(ctx).Table("puzzle_votes").Where("user_id = ?", userID).Count(&solved).Error; err != nil {
		return Stats{}, errors.New("db_query_failed")
	}

	var created int64
	if err := s.db.WithContext(ctx).Table("puzzles").Where("creator_user_id = ?", userID).Count(&created).Error; err != nil {
		return Stats{}, errors.New("db_query_failed")
	}

	var inProgress int64
	if err := s.db.WithContext(ctx).Table("puzzle_progresses").Where("user_id = ?", userID).Count(&inProgress).Error; err != nil {
		return Stats{}, errors.New("db_query_failed")
	}

	return Stats{
		SolvedCount:     int(solved),
		CreatedCount:    int(created),
		InProgressCount: int(inProgress),
	}, nil
}
