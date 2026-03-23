package httpapi

import (
	"time"

	api "github.com/imsihun/quest-room/server/internal/api"
	"github.com/imsihun/quest-room/server/internal/service"
	sqlcstore "github.com/imsihun/quest-room/server/internal/store/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

func toAPIRoomFromSummary(row *sqlcstore.GetRoomSummaryByIDRow) api.Room {
	return api.Room{
		Id:                     row.ID,
		Name:                   row.Name,
		FinalGoal:              row.FinalGoal,
		FinalGoalDate:          toOpenAPIDate(row.FinalGoalDate),
		DailyGoalCutoffPercent: int(row.DailyGoalCutoffPercent),
		Timezone:               row.Timezone,
		InviteToken:            row.InviteToken,
		LeaderMemberId:         row.LeaderMemberID,
		MemberCount:            int(row.MemberCount),
		CreatedAt:              mustTime(row.CreatedAt),
		UpdatedAt:              mustTime(row.UpdatedAt),
	}
}

func toAPIRoomFromInviteSummary(row *sqlcstore.GetRoomSummaryByInviteTokenRow) api.Room {
	return api.Room{
		Id:                     row.ID,
		Name:                   row.Name,
		FinalGoal:              row.FinalGoal,
		FinalGoalDate:          toOpenAPIDate(row.FinalGoalDate),
		DailyGoalCutoffPercent: int(row.DailyGoalCutoffPercent),
		Timezone:               row.Timezone,
		InviteToken:            row.InviteToken,
		LeaderMemberId:         row.LeaderMemberID,
		MemberCount:            int(row.MemberCount),
		CreatedAt:              mustTime(row.CreatedAt),
		UpdatedAt:              mustTime(row.UpdatedAt),
	}
}

func toAPIRoomFromListSummary(row *sqlcstore.ListRoomSummariesRow) api.Room {
	return api.Room{
		Id:                     row.ID,
		Name:                   row.Name,
		FinalGoal:              row.FinalGoal,
		FinalGoalDate:          toOpenAPIDate(row.FinalGoalDate),
		DailyGoalCutoffPercent: int(row.DailyGoalCutoffPercent),
		Timezone:               row.Timezone,
		InviteToken:            row.InviteToken,
		LeaderMemberId:         row.LeaderMemberID,
		MemberCount:            int(row.MemberCount),
		CreatedAt:              mustTime(row.CreatedAt),
		UpdatedAt:              mustTime(row.UpdatedAt),
	}
}

func toAPIMember(member *sqlcstore.Member) api.Member {
	return api.Member{
		Id:       member.ID,
		RoomId:   member.RoomID,
		Nickname: member.Nickname,
		Role:     api.MemberRole(member.Role),
		JoinedAt: mustTime(member.JoinedAt),
	}
}

func toAPIRecurringQuest(quest *sqlcstore.RecurringQuest) api.RecurringQuest {
	return api.RecurringQuest{
		Id:                quest.ID,
		RoomId:            quest.RoomID,
		Title:             quest.Title,
		Description:       quest.Description,
		IsActive:          quest.IsActive,
		SortOrder:         int(quest.SortOrder),
		CreatedByMemberId: quest.CreatedByMemberID,
		CreatedAt:         mustTime(quest.CreatedAt),
		UpdatedAt:         mustTime(quest.UpdatedAt),
	}
}

func toAPICompletion(completion *sqlcstore.Completion) api.Completion {
	result := api.Completion{
		QuestId:     completion.QuestID,
		RoomId:      completion.RoomID,
		Date:        toOpenAPIDate(completion.Date),
		MemberId:    completion.MemberID,
		CompletedAt: mustTime(completion.CompletedAt),
	}

	if completion.Note.Valid {
		note := completion.Note.String
		result.Note = &note
	}

	return result
}

func toAPIMemberDailyStatus(status service.MemberDailyStatusResult) api.MemberDailyStatus {
	return api.MemberDailyStatus{
		MemberId:              status.MemberID,
		Date:                  openapi_types.Date{Time: status.Date},
		Status:                api.DailyGoalStatus(status.Status),
		CompletedQuestCount:   status.CompletedQuestCount,
		RequiredQuestCount:    status.RequiredQuestCount,
		TotalActiveQuestCount: status.TotalActiveQuestCount,
	}
}

func mustTime(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}

	return value.Time.UTC()
}

func toOpenAPIDate(value pgtype.Date) openapi_types.Date {
	if !value.Valid {
		return openapi_types.Date{}
	}

	return openapi_types.Date{Time: value.Time}
}
