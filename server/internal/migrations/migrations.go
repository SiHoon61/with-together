package migrations

import (
	"errors"
	"fmt"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func Up(databaseURL string, migrationsPath string) error {
	absolutePath, err := filepath.Abs(migrationsPath)
	if err != nil {
		return fmt.Errorf("resolve migrations path: %w", err)
	}

	sourceURL := "file://" + filepath.ToSlash(absolutePath)
	m, err := migrate.New(sourceURL, databaseURL)
	if err != nil {
		return fmt.Errorf("create migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		sourceErr, databaseErr := m.Close()
		if sourceErr != nil {
			return fmt.Errorf("close migration source: %w", sourceErr)
		}
		if databaseErr != nil {
			return fmt.Errorf("close migration database: %w", databaseErr)
		}
		return fmt.Errorf("run migrations: %w", err)
	}

	sourceErr, databaseErr := m.Close()
	if sourceErr != nil {
		return fmt.Errorf("close migration source: %w", sourceErr)
	}
	if databaseErr != nil {
		return fmt.Errorf("close migration database: %w", databaseErr)
	}

	return nil
}
