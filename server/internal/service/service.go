package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/imsihun/quest-room/server/internal/secure"
	"github.com/imsihun/quest-room/server/internal/store"
	sqlcstore "github.com/imsihun/quest-room/server/internal/store/sqlc"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

const sessionLifetime = 365 * 24 * time.Hour

type Service struct {
	store *store.Store
	now   func() time.Time
}

type CreateRoomInput struct {
	RoomName       string
	LeaderNickname string
	FinalGoal      string
	FinalGoalDate  time.Time
	Timezone       string
}

type CreateRoomResult struct {
	RoomSummary  *sqlcstore.GetRoomSummaryByIDRow
	Leader       *sqlcstore.Member
	Session      *sqlcstore.Session
	SessionToken string
}

type InviteSummaryResult struct {
	Room            *sqlcstore.GetRoomSummaryByInviteTokenRow
	RecurringQuests []*sqlcstore.RecurringQuest
}

type RoomListResult struct {
	Rooms []*sqlcstore.ListRoomSummariesRow
}

type JoinInviteMemberInput struct {
	InviteToken string
	Nickname    string
}

type JoinInviteMemberResult struct {
	RoomSummary  *sqlcstore.GetRoomSummaryByIDRow
	Member       *sqlcstore.Member
	Session      *sqlcstore.Session
	SessionToken string
}

type AuthContext struct {
	SessionID              int64
	MemberID               string
	RoomID                 string
	Nickname               string
	Role                   sqlcstore.MemberRole
	JoinedAt               time.Time
	ExpiresAt              time.Time
	InviteToken            string
	RoomName               string
	FinalGoal              string
	DailyGoalCutoffPercent int
	Timezone               string
}

type RoomDashboardResult struct {
	RoomSummary         *sqlcstore.GetRoomSummaryByIDRow
	CurrentMember       *sqlcstore.Member
	Members             []*sqlcstore.Member
	RecurringQuests     []*sqlcstore.RecurringQuest
	TodayDate           time.Time
	TodayCompletions    []*sqlcstore.Completion
	TodayMemberStatuses []MemberDailyStatusResult
}

type UpdateRoomInput struct {
	RoomID                 string
	RoomName               *string
	FinalGoal              *string
	FinalGoalDate          *time.Time
	DailyGoalCutoffPercent *int
}

type RotateInviteTokenResult struct {
	InviteToken string
}

type CreateRecurringQuestInput struct {
	RoomID      string
	Title       string
	Description string
	SortOrder   *int
}

type UpdateRecurringQuestInput struct {
	RoomID      string
	QuestID     string
	Title       *string
	Description *string
	SortOrder   *int
	IsActive    *bool
}

type ListCompletionsInput struct {
	RoomID   string
	FromDate time.Time
	ToDate   time.Time
	QuestID  *string
	MemberID *string
}

type RoomDailyStatusResult struct {
	RoomID          string
	Date            time.Time
	RecurringQuests []*sqlcstore.RecurringQuest
	Completions     []*sqlcstore.Completion
	MemberStatuses  []MemberDailyStatusResult
}

type MemberDailyStatusResult struct {
	MemberID              string
	Date                  time.Time
	Status                string
	CompletedQuestCount   int
	RequiredQuestCount    int
	TotalActiveQuestCount int
}

type PutCompletionInput struct {
	RoomID  string
	QuestID string
	Date    time.Time
	Note    *string
}

func New(store *store.Store) *Service {
	return &Service{
		store: store,
		now:   func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) CreateRoom(ctx context.Context, input CreateRoomInput) (*CreateRoomResult, error) {
	if err := validateCreateRoomInput(input); err != nil {
		return nil, err
	}

	now := s.now()
	expiresAt := now.Add(sessionLifetime)

	roomID, err := secure.GeneratePrefixedID("room")
	if err != nil {
		return nil, fmt.Errorf("generate room id: %w", err)
	}

	memberID, err := secure.GeneratePrefixedID("mem")
	if err != nil {
		return nil, fmt.Errorf("generate member id: %w", err)
	}

	inviteToken, err := secure.GenerateOpaqueToken("ivt")
	if err != nil {
		return nil, fmt.Errorf("generate invite token: %w", err)
	}

	sessionToken, err := secure.GenerateOpaqueToken("ses")
	if err != nil {
		return nil, fmt.Errorf("generate session token: %w", err)
	}

	sessionTokenHash := secure.HashToken(sessionToken)

	issuedAt := timestamptz(now)
	expiry := timestamptz(expiresAt)

	var (
		roomSummary *sqlcstore.GetRoomSummaryByIDRow
		member      *sqlcstore.Member
		session     *sqlcstore.Session
	)

	err = s.store.WithTx(ctx, func(q *sqlcstore.Queries) error {
		if _, err := q.CreateRoom(ctx, sqlcstore.CreateRoomParams{
			ID:            roomID,
			Name:          input.RoomName,
			FinalGoal:     input.FinalGoal,
			FinalGoalDate: pgDate(input.FinalGoalDate),
			Timezone:      input.Timezone,
			InviteToken:   inviteToken,
		}); err != nil {
			return wrapQueryError(err)
		}

		member, err = q.CreateMember(ctx, sqlcstore.CreateMemberParams{
			ID:       memberID,
			RoomID:   roomID,
			Nickname: input.LeaderNickname,
			Role:     sqlcstore.MemberRoleLeader,
		})
		if err != nil {
			return wrapQueryError(err)
		}

		session, err = q.CreateSession(ctx, sqlcstore.CreateSessionParams{
			MemberID:         memberID,
			RoomID:           roomID,
			SessionTokenHash: sessionTokenHash,
			IssuedAt:         issuedAt,
			ExpiresAt:        expiry,
			LastSeenAt:       issuedAt,
		})
		if err != nil {
			return wrapQueryError(err)
		}

		roomSummary, err = q.GetRoomSummaryByID(ctx, roomID)
		if err != nil {
			return wrapQueryError(err)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &CreateRoomResult{
		RoomSummary:  roomSummary,
		Leader:       member,
		Session:      session,
		SessionToken: sessionToken,
	}, nil
}

func (s *Service) GetInviteSummary(ctx context.Context, inviteToken string) (*InviteSummaryResult, error) {
	if strings.TrimSpace(inviteToken) == "" {
		return nil, ErrInvalidInput
	}

	room, err := s.store.Queries().GetRoomSummaryByInviteToken(ctx, inviteToken)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	quests, err := s.store.Queries().ListActiveRecurringQuestsByRoomID(ctx, room.ID)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return &InviteSummaryResult{
		Room:            room,
		RecurringQuests: quests,
	}, nil
}

func (s *Service) ListRooms(ctx context.Context) (*RoomListResult, error) {
	rooms, err := s.store.Queries().ListRoomSummaries(ctx)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return &RoomListResult{Rooms: rooms}, nil
}

func (s *Service) JoinInviteAsMember(ctx context.Context, input JoinInviteMemberInput) (*JoinInviteMemberResult, error) {
	if err := validateJoinInviteInput(input); err != nil {
		return nil, err
	}

	now := s.now()
	expiresAt := now.Add(sessionLifetime)

	memberID, err := secure.GeneratePrefixedID("mem")
	if err != nil {
		return nil, fmt.Errorf("generate member id: %w", err)
	}

	sessionToken, err := secure.GenerateOpaqueToken("ses")
	if err != nil {
		return nil, fmt.Errorf("generate session token: %w", err)
	}

	sessionTokenHash := secure.HashToken(sessionToken)

	var (
		room        *sqlcstore.Room
		member      *sqlcstore.Member
		session     *sqlcstore.Session
		roomSummary *sqlcstore.GetRoomSummaryByIDRow
	)

	err = s.store.WithTx(ctx, func(q *sqlcstore.Queries) error {
		room, err = q.GetRoomByInviteToken(ctx, input.InviteToken)
		if err != nil {
			return wrapQueryError(err)
		}

		member, err = q.CreateMember(ctx, sqlcstore.CreateMemberParams{
			ID:       memberID,
			RoomID:   room.ID,
			Nickname: input.Nickname,
			Role:     sqlcstore.MemberRoleMember,
		})
		if err != nil {
			return wrapQueryError(err)
		}

		session, err = s.createSessionWithQueries(ctx, q, room.ID, memberID, sessionTokenHash, now, expiresAt)
		if err != nil {
			return err
		}

		roomSummary, err = q.GetRoomSummaryByID(ctx, room.ID)
		if err != nil {
			return wrapQueryError(err)
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &JoinInviteMemberResult{
		RoomSummary:  roomSummary,
		Member:       member,
		Session:      session,
		SessionToken: sessionToken,
	}, nil
}

func (s *Service) AuthenticateSession(ctx context.Context, authorizationHeader string) (*AuthContext, error) {
	token, err := bearerToken(authorizationHeader)
	if err != nil {
		return nil, err
	}

	row, err := s.store.Queries().GetActiveSessionAuthContextByTokenHash(ctx, secure.HashToken(token))
	if err != nil {
		if errors.Is(wrapQueryError(err), ErrNotFound) {
			return nil, ErrUnauthorized
		}
		return nil, wrapQueryError(err)
	}

	_ = s.store.Queries().TouchSession(ctx, sqlcstore.TouchSessionParams{
		SessionTokenHash: row.SessionTokenHash,
		LastSeenAt:       timestamptz(s.now()),
	})

	return &AuthContext{
		SessionID:              row.SessionID,
		MemberID:               row.MemberID,
		RoomID:                 row.RoomID,
		Nickname:               row.Nickname,
		Role:                   row.Role,
		JoinedAt:               mustValidTime(row.JoinedAt),
		ExpiresAt:              mustValidTime(row.ExpiresAt),
		InviteToken:            row.InviteToken,
		RoomName:               row.RoomName,
		FinalGoal:              row.FinalGoal,
		DailyGoalCutoffPercent: int(row.DailyGoalCutoffPercent),
		Timezone:               row.Timezone,
	}, nil
}

func (s *Service) GetRoomDashboard(ctx context.Context, auth *AuthContext, roomID string) (*RoomDashboardResult, error) {
	if auth == nil {
		return nil, ErrUnauthorized
	}
	if roomID != auth.RoomID {
		return nil, ErrUnauthorized
	}

	roomSummary, err := s.store.Queries().GetRoomSummaryByID(ctx, roomID)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	currentMember, err := s.store.Queries().GetMemberByRoomAndID(ctx, sqlcstore.GetMemberByRoomAndIDParams{
		RoomID: roomID,
		ID:     auth.MemberID,
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	members, err := s.store.Queries().ListMembersByRoomID(ctx, roomID)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	recurringQuests, err := s.store.Queries().ListRecurringQuestsByRoomID(ctx, roomID)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	today, err := roomTodayDate(roomSummary.Timezone, s.now())
	if err != nil {
		return nil, fmt.Errorf("%w: invalid room timezone", ErrInvalidInput)
	}

	todayCompletions, err := s.store.Queries().ListCompletionsByRoomAndDate(ctx, sqlcstore.ListCompletionsByRoomAndDateParams{
		RoomID: roomID,
		Date:   pgDate(today),
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return &RoomDashboardResult{
		RoomSummary:         roomSummary,
		CurrentMember:       currentMember,
		Members:             members,
		RecurringQuests:     recurringQuests,
		TodayDate:           today,
		TodayCompletions:    todayCompletions,
		TodayMemberStatuses: calculateMemberDailyStatuses(today, members, recurringQuests, todayCompletions, int(roomSummary.DailyGoalCutoffPercent)),
	}, nil
}

func (s *Service) UpdateRoom(ctx context.Context, auth *AuthContext, input UpdateRoomInput) (*sqlcstore.GetRoomSummaryByIDRow, error) {
	if err := requireLeader(auth, input.RoomID); err != nil {
		return nil, err
	}

	room, err := s.store.Queries().GetRoomByID(ctx, input.RoomID)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	name := room.Name
	if input.RoomName != nil {
		name = strings.TrimSpace(*input.RoomName)
	}

	finalGoal := room.FinalGoal
	if input.FinalGoal != nil {
		finalGoal = strings.TrimSpace(*input.FinalGoal)
	}
	finalGoalDate := mustValidDate(room.FinalGoalDate)
	if input.FinalGoalDate != nil {
		finalGoalDate = *input.FinalGoalDate
	}
	dailyGoalCutoffPercent := int(room.DailyGoalCutoffPercent)
	if input.DailyGoalCutoffPercent != nil {
		dailyGoalCutoffPercent = *input.DailyGoalCutoffPercent
	}

	if strings.TrimSpace(name) == "" || strings.TrimSpace(finalGoal) == "" || finalGoalDate.IsZero() {
		return nil, fmt.Errorf("%w: roomName, finalGoal, and finalGoalDate must not be empty", ErrInvalidInput)
	}
	if dailyGoalCutoffPercent < 1 || dailyGoalCutoffPercent > 100 {
		return nil, fmt.Errorf("%w: dailyGoalCutoffPercent must be between 1 and 100", ErrInvalidInput)
	}

	if _, err := s.store.Queries().UpdateRoom(ctx, sqlcstore.UpdateRoomParams{
		ID:                     input.RoomID,
		Name:                   name,
		FinalGoal:              finalGoal,
		FinalGoalDate:          pgDate(finalGoalDate),
		DailyGoalCutoffPercent: int32(dailyGoalCutoffPercent),
		Timezone:               room.Timezone,
	}); err != nil {
		return nil, wrapQueryError(err)
	}

	return s.store.Queries().GetRoomSummaryByID(ctx, input.RoomID)
}

func (s *Service) KickRoomMember(ctx context.Context, auth *AuthContext, roomID string, memberID string) error {
	if err := requireLeader(auth, roomID); err != nil {
		return err
	}
	if strings.TrimSpace(memberID) == "" {
		return fmt.Errorf("%w: memberId is required", ErrInvalidInput)
	}
	if auth.MemberID == memberID {
		return ErrCannotKickSelf
	}

	return s.store.WithTx(ctx, func(q *sqlcstore.Queries) error {
		target, err := q.GetMemberByRoomAndID(ctx, sqlcstore.GetMemberByRoomAndIDParams{
			RoomID: roomID,
			ID:     memberID,
		})
		if err != nil {
			return wrapQueryError(err)
		}
		if target.Role == sqlcstore.MemberRoleLeader {
			return ErrCannotKickLeader
		}

		if err := q.DeleteMemberByRoomAndID(ctx, sqlcstore.DeleteMemberByRoomAndIDParams{
			RoomID: roomID,
			ID:     memberID,
		}); err != nil {
			return wrapQueryError(err)
		}

		return nil
	})
}

func (s *Service) RotateInviteToken(ctx context.Context, auth *AuthContext, roomID string) (*RotateInviteTokenResult, error) {
	if err := requireLeader(auth, roomID); err != nil {
		return nil, err
	}

	inviteToken, err := secure.GenerateOpaqueToken("ivt")
	if err != nil {
		return nil, fmt.Errorf("generate invite token: %w", err)
	}

	if _, err := s.store.Queries().RotateInviteToken(ctx, sqlcstore.RotateInviteTokenParams{
		ID:          roomID,
		InviteToken: inviteToken,
	}); err != nil {
		return nil, wrapQueryError(err)
	}

	return &RotateInviteTokenResult{InviteToken: inviteToken}, nil
}

func (s *Service) ListRecurringQuests(ctx context.Context, auth *AuthContext, roomID string) ([]*sqlcstore.RecurringQuest, error) {
	if err := requireRoomMember(auth, roomID); err != nil {
		return nil, err
	}

	return s.store.Queries().ListRecurringQuestsByRoomID(ctx, roomID)
}

func (s *Service) CreateRecurringQuest(ctx context.Context, auth *AuthContext, input CreateRecurringQuestInput) (*sqlcstore.RecurringQuest, error) {
	if err := requireLeader(auth, input.RoomID); err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.Title) == "" || strings.TrimSpace(input.Description) == "" {
		return nil, fmt.Errorf("%w: title and description are required", ErrInvalidInput)
	}

	sortOrder := int32(0)
	if input.SortOrder != nil {
		if *input.SortOrder < 0 {
			return nil, fmt.Errorf("%w: sortOrder must be zero or greater", ErrInvalidInput)
		}
		sortOrder = int32(*input.SortOrder)
	} else {
		next, err := s.store.Queries().GetNextRecurringQuestSortOrder(ctx, input.RoomID)
		if err != nil {
			return nil, wrapQueryError(err)
		}
		sortOrder = next
	}

	questID, err := secure.GeneratePrefixedID("quest")
	if err != nil {
		return nil, fmt.Errorf("generate recurring quest id: %w", err)
	}

	quest, err := s.store.Queries().CreateRecurringQuest(ctx, sqlcstore.CreateRecurringQuestParams{
		ID:                questID,
		RoomID:            input.RoomID,
		Title:             strings.TrimSpace(input.Title),
		Description:       strings.TrimSpace(input.Description),
		SortOrder:         sortOrder,
		IsActive:          true,
		CreatedByMemberID: auth.MemberID,
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return quest, nil
}

func (s *Service) UpdateRecurringQuest(ctx context.Context, auth *AuthContext, input UpdateRecurringQuestInput) (*sqlcstore.RecurringQuest, error) {
	if err := requireLeader(auth, input.RoomID); err != nil {
		return nil, err
	}

	quest, err := s.store.Queries().GetRecurringQuestByID(ctx, sqlcstore.GetRecurringQuestByIDParams{
		RoomID: input.RoomID,
		ID:     input.QuestID,
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	title := quest.Title
	if input.Title != nil {
		title = strings.TrimSpace(*input.Title)
	}
	description := quest.Description
	if input.Description != nil {
		description = strings.TrimSpace(*input.Description)
	}
	sortOrder := quest.SortOrder
	if input.SortOrder != nil {
		if *input.SortOrder < 0 {
			return nil, fmt.Errorf("%w: sortOrder must be zero or greater", ErrInvalidInput)
		}
		sortOrder = int32(*input.SortOrder)
	}
	isActive := quest.IsActive
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	if strings.TrimSpace(title) == "" || strings.TrimSpace(description) == "" {
		return nil, fmt.Errorf("%w: title and description must not be empty", ErrInvalidInput)
	}

	updated, err := s.store.Queries().UpdateRecurringQuest(ctx, sqlcstore.UpdateRecurringQuestParams{
		RoomID:      input.RoomID,
		ID:          input.QuestID,
		Title:       title,
		Description: description,
		SortOrder:   sortOrder,
		IsActive:    isActive,
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return updated, nil
}

func (s *Service) ListCompletions(ctx context.Context, auth *AuthContext, input ListCompletionsInput) ([]*sqlcstore.Completion, error) {
	if err := requireRoomMember(auth, input.RoomID); err != nil {
		return nil, err
	}
	if input.FromDate.IsZero() || input.ToDate.IsZero() {
		return nil, fmt.Errorf("%w: from and to are required", ErrInvalidInput)
	}
	if input.ToDate.Before(input.FromDate) {
		return nil, fmt.Errorf("%w: to must not be before from", ErrInvalidInput)
	}

	items, err := s.store.Queries().ListCompletionsByRoomAndDateRange(ctx, sqlcstore.ListCompletionsByRoomAndDateRangeParams{
		RoomID:   input.RoomID,
		FromDate: pgDate(input.FromDate),
		ToDate:   pgDate(input.ToDate),
		QuestID:  pgText(input.QuestID),
		MemberID: pgText(input.MemberID),
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return items, nil
}

func (s *Service) GetRoomDailyStatus(ctx context.Context, auth *AuthContext, roomID string, date time.Time) (*RoomDailyStatusResult, error) {
	if err := requireRoomMember(auth, roomID); err != nil {
		return nil, err
	}

	members, err := s.store.Queries().ListMembersByRoomID(ctx, roomID)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	quests, err := s.store.Queries().ListRecurringQuestsByRoomID(ctx, roomID)
	if err != nil {
		return nil, wrapQueryError(err)
	}

	completions, err := s.store.Queries().ListCompletionsByRoomAndDate(ctx, sqlcstore.ListCompletionsByRoomAndDateParams{
		RoomID: roomID,
		Date:   pgDate(date),
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return &RoomDailyStatusResult{
		RoomID:          roomID,
		Date:            date,
		RecurringQuests: quests,
		Completions:     completions,
		MemberStatuses:  calculateMemberDailyStatuses(date, members, quests, completions, auth.DailyGoalCutoffPercent),
	}, nil
}

func (s *Service) PutMyQuestCompletion(ctx context.Context, auth *AuthContext, input PutCompletionInput) (*sqlcstore.Completion, error) {
	if err := requireRoomMember(auth, input.RoomID); err != nil {
		return nil, err
	}

	quest, err := s.store.Queries().GetRecurringQuestByID(ctx, sqlcstore.GetRecurringQuestByIDParams{
		RoomID: input.RoomID,
		ID:     input.QuestID,
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}
	if !quest.IsActive {
		return nil, fmt.Errorf("%w: quest is inactive", ErrInvalidInput)
	}

	completion, err := s.store.Queries().UpsertCompletion(ctx, sqlcstore.UpsertCompletionParams{
		MemberID:    auth.MemberID,
		QuestID:     input.QuestID,
		RoomID:      input.RoomID,
		Date:        pgDate(input.Date),
		CompletedAt: timestamptz(s.now()),
		Note:        pgText(input.Note),
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return completion, nil
}

func (s *Service) DeleteMyQuestCompletion(ctx context.Context, auth *AuthContext, roomID string, questID string, date time.Time) error {
	if err := requireRoomMember(auth, roomID); err != nil {
		return err
	}

	rows, err := s.store.Queries().DeleteCompletion(ctx, sqlcstore.DeleteCompletionParams{
		MemberID: auth.MemberID,
		QuestID:  questID,
		Date:     pgDate(date),
	})
	if err != nil {
		return wrapQueryError(err)
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

func validateCreateRoomInput(input CreateRoomInput) error {
	switch {
	case strings.TrimSpace(input.RoomName) == "":
		return fmt.Errorf("%w: roomName is required", ErrInvalidInput)
	case strings.TrimSpace(input.LeaderNickname) == "":
		return fmt.Errorf("%w: leaderNickname is required", ErrInvalidInput)
	case strings.TrimSpace(input.FinalGoal) == "":
		return fmt.Errorf("%w: finalGoal is required", ErrInvalidInput)
	case input.FinalGoalDate.IsZero():
		return fmt.Errorf("%w: finalGoalDate is required", ErrInvalidInput)
	case strings.TrimSpace(input.Timezone) == "":
		return fmt.Errorf("%w: timezone is required", ErrInvalidInput)
	case len([]rune(strings.TrimSpace(input.LeaderNickname))) > 24:
		return fmt.Errorf("%w: leaderNickname must be 24 characters or fewer", ErrInvalidInput)
	default:
		return nil
	}
}

func validateJoinInviteInput(input JoinInviteMemberInput) error {
	switch {
	case strings.TrimSpace(input.InviteToken) == "":
		return fmt.Errorf("%w: inviteToken is required", ErrInvalidInput)
	case strings.TrimSpace(input.Nickname) == "":
		return fmt.Errorf("%w: nickname is required", ErrInvalidInput)
	case len([]rune(strings.TrimSpace(input.Nickname))) > 24:
		return fmt.Errorf("%w: nickname must be 24 characters or fewer", ErrInvalidInput)
	default:
		return nil
	}
}

func requireRoomMember(auth *AuthContext, roomID string) error {
	if auth == nil {
		return ErrUnauthorized
	}
	if strings.TrimSpace(roomID) == "" || auth.RoomID != roomID {
		return ErrForbidden
	}
	return nil
}

func requireLeader(auth *AuthContext, roomID string) error {
	if err := requireRoomMember(auth, roomID); err != nil {
		return err
	}
	if auth.Role != sqlcstore.MemberRoleLeader {
		return ErrForbidden
	}
	return nil
}

func wrapQueryError(err error) error {
	if err == nil {
		return nil
	}

	if errors.Is(err, ErrNotFound) {
		return err
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		if pgErr.Code == "23505" {
			return fmt.Errorf("%w: %s", ErrConflict, pgErr.ConstraintName)
		}
	}

	if strings.Contains(err.Error(), "no rows in result set") {
		return ErrNotFound
	}

	return err
}

func timestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{
		Time:  t.UTC(),
		Valid: true,
	}
}

func (s *Service) createSessionWithQueries(ctx context.Context, q *sqlcstore.Queries, roomID string, memberID string, sessionTokenHash string, issuedAt time.Time, expiresAt time.Time) (*sqlcstore.Session, error) {
	session, err := q.CreateSession(ctx, sqlcstore.CreateSessionParams{
		MemberID:         memberID,
		RoomID:           roomID,
		SessionTokenHash: sessionTokenHash,
		IssuedAt:         timestamptz(issuedAt),
		ExpiresAt:        timestamptz(expiresAt),
		LastSeenAt:       timestamptz(issuedAt),
	})
	if err != nil {
		return nil, wrapQueryError(err)
	}

	return session, nil
}

func bearerToken(header string) (string, error) {
	header = strings.TrimSpace(header)
	if header == "" {
		return "", ErrUnauthorized
	}

	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return "", ErrUnauthorized
	}

	token := strings.TrimSpace(strings.TrimPrefix(header, prefix))
	if token == "" {
		return "", ErrUnauthorized
	}

	return token, nil
}

func roomTodayDate(timezone string, now time.Time) (time.Time, error) {
	location, err := time.LoadLocation(timezone)
	if err != nil {
		return time.Time{}, err
	}

	localNow := now.In(location)
	return time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, location), nil
}

func pgDate(t time.Time) pgtype.Date {
	return pgtype.Date{
		Time:  time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location()),
		Valid: true,
	}
}

func pgText(value *string) pgtype.Text {
	if value == nil {
		return pgtype.Text{}
	}

	return pgtype.Text{
		String: strings.TrimSpace(*value),
		Valid:  true,
	}
}

func mustValidTime(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}

	return value.Time.UTC()
}

func mustValidDate(value pgtype.Date) time.Time {
	if !value.Valid {
		return time.Time{}
	}

	return value.Time
}

func calculateMemberDailyStatuses(
	date time.Time,
	members []*sqlcstore.Member,
	recurringQuests []*sqlcstore.RecurringQuest,
	completions []*sqlcstore.Completion,
	cutoffPercent int,
) []MemberDailyStatusResult {
	activeQuestIDs := make(map[string]struct{})
	for _, quest := range recurringQuests {
		if quest.IsActive {
			activeQuestIDs[quest.ID] = struct{}{}
		}
	}

	totalActiveQuestCount := len(activeQuestIDs)
	requiredQuestCount := requiredQuestCount(totalActiveQuestCount, cutoffPercent)
	completedByMember := make(map[string]int)

	for _, completion := range completions {
		if _, ok := activeQuestIDs[completion.QuestID]; !ok {
			continue
		}
		completedByMember[completion.MemberID]++
	}

	statuses := make([]MemberDailyStatusResult, 0, len(members))
	for _, member := range members {
		completedQuestCount := completedByMember[member.ID]
		statuses = append(statuses, MemberDailyStatusResult{
			MemberID:              member.ID,
			Date:                  date,
			Status:                dailyGoalStatus(completedQuestCount, requiredQuestCount, totalActiveQuestCount),
			CompletedQuestCount:   completedQuestCount,
			RequiredQuestCount:    requiredQuestCount,
			TotalActiveQuestCount: totalActiveQuestCount,
		})
	}

	return statuses
}

func requiredQuestCount(totalActiveQuestCount int, cutoffPercent int) int {
	if totalActiveQuestCount <= 0 {
		return 0
	}

	rounded := int(math.Round(float64(totalActiveQuestCount) * float64(cutoffPercent) / 100))
	if rounded < 1 {
		return 1
	}

	return rounded
}

func dailyGoalStatus(completedQuestCount int, requiredQuestCount int, totalActiveQuestCount int) string {
	if totalActiveQuestCount <= 0 {
		return "under_target"
	}
	if completedQuestCount >= totalActiveQuestCount {
		return "perfect"
	}
	if completedQuestCount >= requiredQuestCount {
		return "goal_met"
	}
	return "under_target"
}
