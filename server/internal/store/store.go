package store

import (
	"context"
	"fmt"

	sqlcstore "github.com/imsihun/quest-room/server/internal/store/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool    *pgxpool.Pool
	queries *sqlcstore.Queries
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{
		pool:    pool,
		queries: sqlcstore.New(pool),
	}
}

func (s *Store) Pool() *pgxpool.Pool {
	return s.pool
}

func (s *Store) Queries() *sqlcstore.Queries {
	return s.queries
}

func (s *Store) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func (s *Store) Close() {
	s.pool.Close()
}

func (s *Store) WithTx(ctx context.Context, fn func(*sqlcstore.Queries) error) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	queries := s.queries.WithTx(tx)

	if err := fn(queries); err != nil {
		if rollbackErr := tx.Rollback(ctx); rollbackErr != nil {
			return fmt.Errorf("rollback transaction after %v: %w", err, rollbackErr)
		}

		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}
