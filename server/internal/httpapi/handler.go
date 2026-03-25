package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	api "github.com/imsihun/quest-room/server/internal/api"
	"github.com/imsihun/quest-room/server/internal/service"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type Handler struct {
	service *service.Service
}

func New(service *service.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, api.HealthResponse{
		Data: api.HealthData{Status: "ok"},
	})
}

func (h *Handler) ListRooms(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.ListRooms(r.Context())
	if err != nil {
		h.writeError(w, err)
		return
	}

	rooms := make([]api.Room, 0, len(result.Rooms))
	for _, room := range result.Rooms {
		rooms = append(rooms, toAPIRoomFromListSummary(room))
	}

	writeJSON(w, http.StatusOK, api.RoomListResponse{
		Data: api.RoomListData{
			Rooms: rooms,
		},
	})
}

func (h *Handler) GetInviteSummary(w http.ResponseWriter, r *http.Request, inviteToken string) {
	result, err := h.service.GetInviteSummary(r.Context(), inviteToken)
	if err != nil {
		h.writeError(w, err)
		return
	}

	quests := make([]api.RecurringQuest, 0, len(result.RecurringQuests))
	for _, quest := range result.RecurringQuests {
		quests = append(quests, toAPIRecurringQuest(quest))
	}

	writeJSON(w, http.StatusOK, api.InviteSummaryResponse{
		Data: api.InviteSummaryData{
			Room:            toAPIRoomFromInviteSummary(result.Room),
			RecurringQuests: quests,
		},
	})
}

func (h *Handler) JoinInviteAsMember(w http.ResponseWriter, r *http.Request, inviteToken string) {
	var req api.JoinInviteMemberRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: api.Error{
				Code:    "invalid_request",
				Message: err.Error(),
			},
		})
		return
	}

	result, err := h.service.JoinInviteAsMember(r.Context(), service.JoinInviteMemberInput{
		InviteToken: inviteToken,
		Nickname:    strings.TrimSpace(req.Nickname),
	})
	if err != nil {
		h.writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, api.JoinInviteMemberResponse{
		Data: api.JoinInviteMemberData{
			Room:   toAPIRoomFromSummary(result.RoomSummary),
			Member: toAPIMember(result.Member),
			Session: api.Session{
				SessionToken: result.SessionToken,
				IssuedAt:     mustTime(result.Session.IssuedAt),
				ExpiresAt:    mustTime(result.Session.ExpiresAt),
			},
		},
	})
}

func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var req api.CreateRoomRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: api.Error{
				Code:    "invalid_request",
				Message: err.Error(),
			},
		})
		return
	}

	result, err := h.service.CreateRoom(r.Context(), service.CreateRoomInput{
		RoomName:       strings.TrimSpace(req.RoomName),
		LeaderNickname: strings.TrimSpace(req.LeaderNickname),
		FinalGoal:      strings.TrimSpace(req.FinalGoal),
		FinalGoalDate:  req.FinalGoalDate.Time,
		Visibility:     string(req.Visibility),
		Timezone:       strings.TrimSpace(req.Timezone),
	})
	if err != nil {
		h.writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, api.CreateRoomResponse{
		Data: api.CreateRoomData{
			Room:      toAPIRoomFromSummary(result.RoomSummary),
			Member:    toAPIMember(result.Leader),
			InviteUrl: buildInviteURL(r, result.RoomSummary.InviteToken),
			Session: api.Session{
				SessionToken: result.SessionToken,
				IssuedAt:     mustTime(result.Session.IssuedAt),
				ExpiresAt:    mustTime(result.Session.ExpiresAt),
			},
		},
	})
}

func (h *Handler) GetRoomDashboard(w http.ResponseWriter, r *http.Request, roomId string) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	result, err := h.service.GetRoomDashboard(r.Context(), auth, roomId)
	if err != nil {
		h.writeError(w, err)
		return
	}

	members := make([]api.Member, 0, len(result.Members))
	for _, member := range result.Members {
		members = append(members, toAPIMember(member))
	}

	quests := make([]api.RecurringQuest, 0, len(result.RecurringQuests))
	for _, quest := range result.RecurringQuests {
		quests = append(quests, toAPIRecurringQuest(quest))
	}

	completions := make([]api.Completion, 0, len(result.TodayCompletions))
	for _, completion := range result.TodayCompletions {
		completions = append(completions, toAPICompletion(completion))
	}

	memberStatuses := make([]api.MemberDailyStatus, 0, len(result.TodayMemberStatuses))
	for _, status := range result.TodayMemberStatuses {
		memberStatuses = append(memberStatuses, toAPIMemberDailyStatus(status))
	}

	writeJSON(w, http.StatusOK, api.RoomDashboardResponse{
		Data: api.RoomDashboardData{
			Room:                toAPIRoomFromSummary(result.RoomSummary),
			TodayDate:           openapi_types.Date{Time: result.TodayDate},
			CurrentMember:       toAPIMember(result.CurrentMember),
			Members:             members,
			RecurringQuests:     quests,
			TodayCompletions:    completions,
			TodayMemberStatuses: memberStatuses,
		},
	})
}

func (h *Handler) UpdateRoom(w http.ResponseWriter, r *http.Request, roomId string) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	var req api.UpdateRoomRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: api.Error{
				Code:    "invalid_request",
				Message: err.Error(),
			},
		})
		return
	}

	result, err := h.service.UpdateRoom(r.Context(), auth, service.UpdateRoomInput{
		RoomID:                 roomId,
		RoomName:               req.RoomName,
		FinalGoal:              req.FinalGoal,
		FinalGoalDate:          optionalDate(req.FinalGoalDate),
		DailyGoalCutoffPercent: req.DailyGoalCutoffPercent,
		Visibility:             optionalRoomVisibility(req.Visibility),
	})
	if err != nil {
		h.writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, api.RoomResponse{
		Data: api.RoomData{
			Room: toAPIRoomFromSummary(result),
		},
	})
}

func (h *Handler) KickRoomMember(w http.ResponseWriter, r *http.Request, roomId string, memberId string) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	if err := h.service.KickRoomMember(r.Context(), auth, roomId, memberId); err != nil {
		h.writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ListCompletions(w http.ResponseWriter, r *http.Request, roomId string, params api.ListCompletionsParams) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	items, err := h.service.ListCompletions(r.Context(), auth, service.ListCompletionsInput{
		RoomID:   roomId,
		FromDate: params.From.Time,
		ToDate:   params.To.Time,
		QuestID:  params.QuestId,
		MemberID: params.MemberId,
	})
	if err != nil {
		h.writeError(w, err)
		return
	}

	completions := make([]api.Completion, 0, len(items))
	for _, item := range items {
		completions = append(completions, toAPICompletion(item))
	}

	writeJSON(w, http.StatusOK, api.CompletionListResponse{
		Data: api.CompletionListData{
			Items: completions,
		},
	})
}

func optionalDate(value *openapi_types.Date) *time.Time {
	if value == nil {
		return nil
	}

	result := value.Time
	return &result
}

func optionalRoomVisibility(value *api.RoomVisibility) *string {
	if value == nil {
		return nil
	}

	result := string(*value)
	return &result
}

func (h *Handler) GetRoomDailyStatus(w http.ResponseWriter, r *http.Request, roomId string, date openapi_types.Date) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	result, err := h.service.GetRoomDailyStatus(r.Context(), auth, roomId, date.Time)
	if err != nil {
		h.writeError(w, err)
		return
	}

	quests := make([]api.RecurringQuest, 0, len(result.RecurringQuests))
	for _, quest := range result.RecurringQuests {
		quests = append(quests, toAPIRecurringQuest(quest))
	}

	members := make([]api.Member, 0, len(result.Members))
	for _, member := range result.Members {
		members = append(members, toAPIMember(member))
	}

	completions := make([]api.Completion, 0, len(result.Completions))
	for _, completion := range result.Completions {
		completions = append(completions, toAPICompletion(completion))
	}

	memberStatuses := make([]api.MemberDailyStatus, 0, len(result.MemberStatuses))
	for _, status := range result.MemberStatuses {
		memberStatuses = append(memberStatuses, toAPIMemberDailyStatus(status))
	}

	writeJSON(w, http.StatusOK, api.RoomDailyStatusResponse{
		Data: api.RoomDailyStatusData{
			RoomId:          result.RoomID,
			Date:            openapi_types.Date{Time: result.Date},
			Members:         members,
			RecurringQuests: quests,
			Completions:     completions,
			MemberStatuses:  memberStatuses,
		},
	})
}

func (h *Handler) RotateInviteToken(w http.ResponseWriter, r *http.Request, roomId string) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	result, err := h.service.RotateInviteToken(r.Context(), auth, roomId)
	if err != nil {
		h.writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, api.RotateInviteTokenResponse{
		Data: api.RotateInviteTokenData{
			InviteToken: result.InviteToken,
			InviteUrl:   buildInviteURL(r, result.InviteToken),
		},
	})
}

func (h *Handler) ListRecurringQuests(w http.ResponseWriter, r *http.Request, roomId string) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	items, err := h.service.ListRecurringQuests(r.Context(), auth, roomId)
	if err != nil {
		h.writeError(w, err)
		return
	}

	quests := make([]api.RecurringQuest, 0, len(items))
	for _, item := range items {
		quests = append(quests, toAPIRecurringQuest(item))
	}

	writeJSON(w, http.StatusOK, api.RecurringQuestListResponse{
		Data: api.RecurringQuestListData{
			Items: quests,
		},
	})
}

func (h *Handler) CreateRecurringQuest(w http.ResponseWriter, r *http.Request, roomId string) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	var req api.CreateRecurringQuestRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: api.Error{
				Code:    "invalid_request",
				Message: err.Error(),
			},
		})
		return
	}

	result, err := h.service.CreateRecurringQuest(r.Context(), auth, service.CreateRecurringQuestInput{
		RoomID:      roomId,
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		SortOrder:   req.SortOrder,
	})
	if err != nil {
		h.writeError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, api.RecurringQuestResponse{
		Data: api.RecurringQuestData{
			RecurringQuest: toAPIRecurringQuest(result),
		},
	})
}

func (h *Handler) UpdateRecurringQuest(w http.ResponseWriter, r *http.Request, roomId string, questId string) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	var req api.UpdateRecurringQuestRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: api.Error{
				Code:    "invalid_request",
				Message: err.Error(),
			},
		})
		return
	}

	result, err := h.service.UpdateRecurringQuest(r.Context(), auth, service.UpdateRecurringQuestInput{
		RoomID:      roomId,
		QuestID:     questId,
		Title:       req.Title,
		Description: req.Description,
		SortOrder:   req.SortOrder,
	})
	if err != nil {
		h.writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, api.RecurringQuestResponse{
		Data: api.RecurringQuestData{
			RecurringQuest: toAPIRecurringQuest(result),
		},
	})
}

func (h *Handler) DeleteRecurringQuest(w http.ResponseWriter, r *http.Request, roomId string, questId string) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	if err := h.service.DeleteRecurringQuest(r.Context(), auth, roomId, questId); err != nil {
		h.writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteMyQuestCompletion(w http.ResponseWriter, r *http.Request, roomId string, questId string, date openapi_types.Date) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	if err := h.service.DeleteMyQuestCompletion(r.Context(), auth, roomId, questId, date.Time); err != nil {
		h.writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) PutMyQuestCompletion(w http.ResponseWriter, r *http.Request, roomId string, questId string, date openapi_types.Date) {
	auth, err := h.authenticate(r)
	if err != nil {
		h.writeError(w, err)
		return
	}

	var req api.PutCompletionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: api.Error{
				Code:    "invalid_request",
				Message: err.Error(),
			},
		})
		return
	}

	result, err := h.service.PutMyQuestCompletion(r.Context(), auth, service.PutCompletionInput{
		RoomID:  roomId,
		QuestID: questId,
		Date:    date.Time,
		Note:    req.Note,
	})
	if err != nil {
		h.writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, api.CompletionResponse{
		Data: api.CompletionData{
			Completion: toAPICompletion(result),
		},
	})
}

func (h *Handler) notImplemented(w http.ResponseWriter) {
	writeJSON(w, http.StatusNotImplemented, api.ErrorResponse{
		Error: api.Error{
			Code:    "not_implemented",
			Message: "This endpoint is not implemented yet.",
		},
	})
}

func (h *Handler) writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
			Error: api.Error{
				Code:    "invalid_request",
				Message: err.Error(),
			},
		})
	case errors.Is(err, service.ErrUnauthorized):
		writeJSON(w, http.StatusUnauthorized, api.ErrorResponse{
			Error: api.Error{
				Code:    "unauthorized",
				Message: "Authentication is required or the provided credential is invalid.",
			},
		})
	case errors.Is(err, service.ErrCannotKickLeader):
		writeJSON(w, http.StatusForbidden, api.ErrorResponse{
			Error: api.Error{
				Code:    "cannot_kick_leader",
				Message: "The leader cannot be removed from the room.",
			},
		})
	case errors.Is(err, service.ErrCannotKickSelf):
		writeJSON(w, http.StatusForbidden, api.ErrorResponse{
			Error: api.Error{
				Code:    "cannot_kick_self",
				Message: "The leader cannot remove themselves from the room.",
			},
		})
	case errors.Is(err, service.ErrForbidden):
		writeJSON(w, http.StatusForbidden, api.ErrorResponse{
			Error: api.Error{
				Code:    "forbidden",
				Message: "You do not have permission to access this resource.",
			},
		})
	case errors.Is(err, service.ErrConflict):
		writeJSON(w, http.StatusConflict, api.ErrorResponse{
			Error: api.Error{
				Code:    "conflict",
				Message: err.Error(),
			},
		})
	case errors.Is(err, service.ErrNotFound):
		writeJSON(w, http.StatusNotFound, api.ErrorResponse{
			Error: api.Error{
				Code:    "not_found",
				Message: "The requested resource could not be found.",
			},
		})
	default:
		writeJSON(w, http.StatusInternalServerError, api.ErrorResponse{
			Error: api.Error{
				Code:    "internal_error",
				Message: "An unexpected error occurred.",
			},
		})
	}
}

func (h *Handler) authenticate(r *http.Request) (*service.AuthContext, error) {
	return h.service.AuthenticateSession(r.Context(), r.Header.Get("Authorization"))
}

func buildInviteURL(r *http.Request, inviteToken string) string {
	scheme := "http"
	if forwardedProto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); forwardedProto != "" {
		scheme = forwardedProto
	} else if r.TLS != nil {
		scheme = "https"
	}

	host := strings.TrimSpace(r.Header.Get("X-Forwarded-Host"))
	if host == "" {
		host = r.Host
	}

	return scheme + "://" + host + "/join/" + inviteToken
}
