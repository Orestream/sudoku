// Package db provides database connection management.
package db

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Open opens a database connection.
func Open(databaseURL string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
}

