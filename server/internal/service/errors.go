package service

import "errors"

var (
	ErrNotFound         = errors.New("not found")
	ErrConflict         = errors.New("conflict")
	ErrInvalidInput     = errors.New("invalid input")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("forbidden")
	ErrCannotKickLeader = errors.New("cannot kick leader")
	ErrCannotKickSelf   = errors.New("cannot kick self")
	ErrNotImplemented   = errors.New("not implemented")
)
