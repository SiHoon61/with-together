import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import GlobalTopBar from "../components/GlobalTopBar";
import LocalSegmentTabs from "../components/LocalSegmentTabs";
import RoomHeader from "../components/RoomHeader";
import MemberStatusStrip from "../components/MemberStatusStrip";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import { useCompletion } from "../hooks/useCompletion";
import { useHorizontalSwipe } from "../hooks/useHorizontalSwipe";
import {
  createRecurringQuest,
  deleteRecurringQuest,
  kickRoomMember,
  updateRecurringQuest,
  updateRoom,
} from "../lib/api";
import { monthlyRoomStatusQueryOptions } from "../lib/queryOptions";

function memberStatusLabel(status) {
  if (status === "perfect") return "오늘 목표 완벽 달성";
  if (status === "goal_met") return "오늘 목표 달성";
  return "오늘 목표 미달성";
}

function requiredQuestCount(totalQuestCount, cutoffPercent) {
  if (totalQuestCount <= 0) return 0;
  return Math.max(1, Math.round((totalQuestCount * cutoffPercent) / 100));
}

function dailyGoalStatus(completedQuestCount, totalQuestCount, cutoffPercent) {
  if (totalQuestCount <= 0) return "under_target";
  if (completedQuestCount >= totalQuestCount) return "perfect";
  if (completedQuestCount >= requiredQuestCount(totalQuestCount, cutoffPercent))
    return "goal_met";
  return "under_target";
}

export default function Dashboard({ roomId, onNavigate }) {
  const queryClient = useQueryClient();
  const { getRoomAccess, markRoomVisited } = useAuth();
  const roomAccess = getRoomAccess(roomId);
  const { data, loading, error, refetch } = useDashboard(roomId);
  const [shareState, setShareState] = useState("idle");
  const [showCreateQuest, setShowCreateQuest] = useState(false);
  const [editingQuestId, setEditingQuestId] = useState(null);
  const [questTitle, setQuestTitle] = useState("");
  const [questDescription, setQuestDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [cutoffDraft, setCutoffDraft] = useState(50);
  const [cutoffSaving, setCutoffSaving] = useState(false);
  const [cutoffError, setCutoffError] = useState(null);
  const [roomNameDraft, setRoomNameDraft] = useState("");
  const [finalGoalDraft, setFinalGoalDraft] = useState("");
  const [finalGoalDateDraft, setFinalGoalDateDraft] = useState("");
  const [visibilityDraft, setVisibilityDraft] = useState("public");
  const [roomSettingsSaving, setRoomSettingsSaving] = useState(false);
  const [roomSettingsError, setRoomSettingsError] = useState(null);
  const [kickLoading, setKickLoading] = useState(false);
  const [kickError, setKickError] = useState(null);
  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => onNavigate("history", { roomId }),
  });

  const todayDate = data?.todayDate ?? new Date().toISOString().slice(0, 10);
  const { completedIds, toggle, pendingQuestId } = useCompletion(
    roomId,
    todayDate,
    data?.todayCompletions ?? [],
    roomAccess?.memberId,
  );

  useEffect(() => {
    if (roomId && roomAccess) {
      markRoomVisited(roomId);
    }
  }, [roomId, roomAccess, markRoomVisited]);

  useEffect(() => {
    if (!roomId || !data?.todayDate) return;

    const currentDate = new Date(data.todayDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    queryClient.prefetchQuery(
      monthlyRoomStatusQueryOptions(roomId, year, month, data.todayDate),
    );
  }, [queryClient, roomId, data?.todayDate]);

  useEffect(() => {
    if (data?.room?.dailyGoalCutoffPercent) {
      setCutoffDraft(data.room.dailyGoalCutoffPercent);
    }
  }, [data?.room?.dailyGoalCutoffPercent]);

  useEffect(() => {
    if (data?.room?.visibility) {
      setVisibilityDraft(data.room.visibility);
    }
  }, [data?.room?.visibility]);

  useEffect(() => {
    if (!data?.room) return;
    setRoomNameDraft(data.room.name ?? "");
    setFinalGoalDraft(data.room.finalGoal ?? "");
    setFinalGoalDateDraft(data.room.finalGoalDate ?? "");
  }, [data?.room]);

  useEffect(() => {
    setKickError(null);
  }, [selectedMemberId]);

  if (!roomAccess) {
    return (
      <div className="center-msg">
        <div className="center-msg-text">이 방에 접근할 수 없어요</div>
        <div className="center-msg-sub">
          메인에서 접근 가능한 방을 다시 선택해 주세요.
        </div>
        <button
          className="btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => onNavigate("home")}
        >
          메인으로 이동
        </button>
      </div>
    );
  }

  if (loading)
    return (
      <div className="center-msg">
        <div className="spinner" />
      </div>
    );

  if (error) {
    return (
      <div className="center-msg">
        <div className="center-msg-text error">불러오기 실패</div>
        <div className="center-msg-sub">{error.message}</div>
      </div>
    );
  }

  const { room, recurringQuests, members, currentMember } = data;
  const isLeader = room.leaderMemberId === currentMember.id;
  const activeQuests = recurringQuests.filter((quest) => quest.isActive);
  const cutoffPercent = room.dailyGoalCutoffPercent ?? 50;
  const todayCompletions = data.todayCompletions ?? [];
  const todayMemberStatuses = data.todayMemberStatuses ?? [];
  const currentMemberStatus = todayMemberStatuses.find(
    (status) => status.memberId === currentMember.id,
  ) ?? {
    memberId: currentMember.id,
    date: todayDate,
    status: dailyGoalStatus(
      completedIds.size,
      activeQuests.length,
      cutoffPercent,
    ),
    completedQuestCount: completedIds.size,
    requiredQuestCount: requiredQuestCount(activeQuests.length, cutoffPercent),
    totalActiveQuestCount: activeQuests.length,
  };
  const selectedMember =
    members.find((member) => member.id === selectedMemberId) ?? null;
  const selectedMemberStatus =
    todayMemberStatuses.find(
      (status) => status.memberId === selectedMemberId,
    ) ?? null;
  const totalMembers = members.length;
  const requiredCount = currentMemberStatus.requiredQuestCount;
  const remainingForGoal = Math.max(0, requiredCount - completedIds.size);

  async function refreshRoomData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["roomDashboard", roomId] }),
      queryClient.invalidateQueries({ queryKey: ["dailyRoomStatus", roomId] }),
      queryClient.invalidateQueries({
        queryKey: ["monthlyRoomStatus", roomId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["monthlyCompletions", roomId],
      }),
    ]);
    await refetch();
  }

  function membersCompletedCount(questId) {
    return todayCompletions.filter(
      (completion) => completion.questId === questId,
    ).length;
  }

  async function copyInviteUrl(inviteUrl) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = inviteUrl;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function handleShareInvite() {
    const inviteToken = room?.inviteToken;
    if (!inviteToken) return;

    const inviteUrl = new URL(
      `/join/${inviteToken}`,
      window.location.origin,
    ).toString();
    const sharePayload = {
      title: `${room.name} 함께하기`,
      text: `${room.name} 방에 같이 참여해 보세요.`,
      url: inviteUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        setShareState("shared");
      } else {
        await copyInviteUrl(inviteUrl);
        setShareState("copied");
      }
    } catch (e) {
      if (e?.name === "AbortError") return;

      try {
        await copyInviteUrl(inviteUrl);
        setShareState("copied");
      } catch {}
    }

    window.setTimeout(() => setShareState("idle"), 2000);
  }

  async function handleCopyInvite() {
    const inviteToken = room?.inviteToken;
    if (!inviteToken) return;

    const inviteUrl = new URL(
      `/join/${inviteToken}`,
      window.location.origin,
    ).toString();

    try {
      await copyInviteUrl(inviteUrl);
      setShareState("copied");
    } catch {}

    window.setTimeout(() => setShareState("idle"), 2000);
  }

  async function handleCreateQuest() {
    if (!roomId || !questTitle.trim() || !questDescription.trim()) return;

    try {
      setCreateLoading(true);
      setCreateError(null);
      if (editingQuestId) {
        await updateRecurringQuest(roomId, editingQuestId, {
          title: questTitle.trim(),
          description: questDescription.trim(),
        });
      } else {
        await createRecurringQuest(roomId, {
          title: questTitle.trim(),
          description: questDescription.trim(),
        });
      }
      setQuestTitle("");
      setQuestDescription("");
      setShowCreateQuest(false);
      setEditingQuestId(null);
      await refreshRoomData();
    } catch (e) {
      setCreateError(e);
    } finally {
      setCreateLoading(false);
    }
  }

  function handleStartEditQuest(quest) {
    setEditingQuestId(quest.id);
    setQuestTitle(quest.title);
    setQuestDescription(quest.description ?? "");
    setShowCreateQuest(true);
    setCreateError(null);
  }

  function resetQuestForm() {
    setEditingQuestId(null);
    setQuestTitle("");
    setQuestDescription("");
    setCreateError(null);
    setShowCreateQuest(false);
  }

  async function handleDeleteQuest(quest) {
    const confirmed = window.confirm(`"${quest.title}" 미션을 삭제할까요?`);
    if (!confirmed) return;

    try {
      setCreateLoading(true);
      setCreateError(null);
      await deleteRecurringQuest(roomId, quest.id);
      if (editingQuestId === quest.id) {
        resetQuestForm();
      }
      await refreshRoomData();
    } catch (e) {
      setCreateError(e);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleKickMember() {
    if (
      !selectedMember ||
      !isLeader ||
      selectedMember.id === currentMember.id
    ) {
      return;
    }

    const confirmed = window.confirm(
      `${selectedMember.nickname} 님을 방에서 강퇴할까요?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setKickLoading(true);
      setKickError(null);
      await kickRoomMember(roomId, selectedMember.id);
      setSelectedMemberId(null);
      await refreshRoomData();
    } catch (e) {
      setKickError(e);
    } finally {
      setKickLoading(false);
    }
  }

  async function handleSaveCutoff() {
    const nextValue = Number(cutoffDraft);
    if (!Number.isFinite(nextValue) || nextValue < 1 || nextValue > 100) {
      setCutoffError(new Error("커트라인은 1부터 100 사이여야 해요."));
      return;
    }

    try {
      setCutoffSaving(true);
      setCutoffError(null);
      await updateRoom(roomId, { dailyGoalCutoffPercent: nextValue });
      await refreshRoomData();
      setShowGoalSettings(false);
    } catch (e) {
      setCutoffError(e);
    } finally {
      setCutoffSaving(false);
    }
  }

  const selectedMemberCompletionIds = new Set(
    todayCompletions
      .filter((completion) => completion.memberId === selectedMemberId)
      .map((completion) => completion.questId),
  );

  async function handleSaveRoomSettings() {
    if (
      !roomNameDraft.trim() ||
      !finalGoalDraft.trim() ||
      !finalGoalDateDraft
    ) {
      setRoomSettingsError(new Error("모든 항목을 입력해 주세요."));
      return;
    }

    try {
      setRoomSettingsSaving(true);
      setRoomSettingsError(null);
      await updateRoom(roomId, {
        roomName: roomNameDraft.trim(),
        finalGoal: finalGoalDraft.trim(),
        finalGoalDate: finalGoalDateDraft,
        visibility: visibilityDraft,
      });
      await refreshRoomData();
      setShowRoomSettings(false);
    } catch (e) {
      setRoomSettingsError(e);
    } finally {
      setRoomSettingsSaving(false);
    }
  }

  return (
    <div className="page-shell" {...swipeHandlers}>
      <GlobalTopBar
        onHome={() => onNavigate("home")}
        onAccess={() => onNavigate("access", { roomId })}
      />
      <LocalSegmentTabs
        active="quest"
        onChange={(id) => {
          if (id === "history") onNavigate("history", { roomId });
        }}
      />
      <div className="scroll-area room-content-scroll">
        <RoomHeader
          room={room}
          todayDate={todayDate}
          onCopyLink={handleCopyInvite}
          shareState={shareState}
          isLeader={isLeader}
          onOpenSettings={() => {
            setRoomSettingsError(null);
            setShowRoomSettings(true);
          }}
        />

        {isLeader && showRoomSettings && (
          <div className="sheet-backdrop" onClick={() => setShowRoomSettings(false)}>
            <div
              className="settings-sheet"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="settings-sheet-header">
                <div>
                  <div className="settings-sheet-title">방 설정</div>
                  <div className="settings-sheet-sub">
                    방 정보와 공개 여부를 바꿀 수 있어요.
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-sheet-close"
                  onClick={() => setShowRoomSettings(false)}
                  aria-label="설정 닫기"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="leader-form">
                <div className="input-group">
                  <div className="input-lbl">방 이름</div>
                  <input
                    className="text-input"
                    type="text"
                    maxLength={40}
                    value={roomNameDraft}
                    onChange={(e) => setRoomNameDraft(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <div className="input-lbl">최종 목표 설명</div>
                  <textarea
                    className="text-input text-area text-area-sm"
                    rows={3}
                    maxLength={120}
                    value={finalGoalDraft}
                    onChange={(e) => setFinalGoalDraft(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <div className="input-lbl">목표 마감일</div>
                  <input
                    className="text-input"
                    type="date"
                    value={finalGoalDateDraft}
                    onChange={(e) => setFinalGoalDateDraft(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <div className="input-lbl">방 공개 여부</div>
                  <div className="visibility-segment">
                    <button
                      type="button"
                      className={`visibility-segment-btn ${visibilityDraft === "public" ? "active" : ""}`}
                      onClick={() => setVisibilityDraft("public")}
                    >
                      공개방
                    </button>
                    <button
                      type="button"
                      className={`visibility-segment-btn ${visibilityDraft === "private" ? "active" : ""}`}
                      onClick={() => setVisibilityDraft("private")}
                    >
                      비밀방
                    </button>
                  </div>
                </div>

                {roomSettingsError && (
                  <div className="error-msg">{roomSettingsError.message}</div>
                )}

                <button
                  className="btn-primary"
                  type="button"
                  disabled={roomSettingsSaving}
                  onClick={handleSaveRoomSettings}
                >
                  {roomSettingsSaving ? "저장 중..." : "방 설정 저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="goal-progress-card">
          <div className="goal-progress-label">오늘의 목표 </div>
          {activeQuests.length === 0 ? (
            <div className="goal-progress-value">
              아직 설정된 반복 미션이 없어요
            </div>
          ) : currentMemberStatus.status === "perfect" ? (
            <div className="goal-progress-value">목표를 모두 완료했어요!</div>
          ) : currentMemberStatus.status === "goal_met" ? (
            <div className="goal-progress-value">일일 목표를 달성했어요</div>
          ) : (
            <div className="goal-progress-value">
              목표 완료까지 {remainingForGoal}개 남았어요
            </div>
          )}
          <div className="goal-progress-sub">
            {activeQuests.length}개 중 {requiredCount}개 완료하면 목표 달성
          </div>
        </div>

        {isLeader && (
          <div className="goal-progress-inline-setting">
            <span className="leader-cutoff-label">일일 목표 커트라인:</span>
            <span className="leader-cutoff-inline-value">
              {room.dailyGoalCutoffPercent}%
            </span>
            <button
              className="leader-cutoff-inline-btn"
              type="button"
              onClick={() => {
                setShowGoalSettings((prev) => !prev);
                setCutoffError(null);
              }}
            >
              {showGoalSettings ? "닫기" : "수정"}
            </button>
          </div>
        )}

        {isLeader && showGoalSettings && (
          <div className="leader-action-card">
            <div className="leader-form leader-form-inline">
              <div className="input-group">
                <div className="input-lbl">목표 달성 기준 퍼센트</div>
                <input
                  className="text-input"
                  type="number"
                  min="1"
                  max="100"
                  value={cutoffDraft}
                  onChange={(e) => setCutoffDraft(e.target.value)}
                />
              </div>

              {cutoffError && (
                <div className="error-msg">{cutoffError.message}</div>
              )}

              <button
                className="btn-primary"
                type="button"
                disabled={cutoffSaving}
                onClick={handleSaveCutoff}
              >
                {cutoffSaving ? "저장 중..." : "커트라인 저장"}
              </button>
            </div>
          </div>
        )}

        <div className="section-label">오늘의 미션</div>

        {isLeader && (
          <div className="leader-action-card">
            <button
              className="leader-action-btn"
              type="button"
              onClick={() => {
                if (showCreateQuest) {
                  resetQuestForm();
                  return;
                }
                setEditingQuestId(null);
                setQuestTitle("");
                setQuestDescription("");
                setCreateError(null);
                setShowCreateQuest(true);
              }}
            >
              {showCreateQuest ? "반복 미션 입력 닫기" : "반복 미션 만들기"}
            </button>

            {showCreateQuest && (
              <div className="leader-form">
                <div className="input-group">
                  <div className="input-lbl">미션 제목</div>
                  <input
                    className="text-input"
                    type="text"
                    maxLength={80}
                    placeholder="예: 물 2리터 마시기"
                    value={questTitle}
                    onChange={(e) => setQuestTitle(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <div className="input-lbl">미션 설명</div>
                  <textarea
                    className="text-input text-area text-area-sm"
                    rows={3}
                    maxLength={160}
                    placeholder="예: 하루 동안 물 2리터 이상 마시고 체크하기"
                    value={questDescription}
                    onChange={(e) => setQuestDescription(e.target.value)}
                  />
                </div>

                {createError && (
                  <div className="error-msg">{createError.message}</div>
                )}

                <button
                  className="btn-primary"
                  type="button"
                  disabled={
                    createLoading ||
                    !questTitle.trim() ||
                    !questDescription.trim()
                  }
                  onClick={handleCreateQuest}
                >
                  {createLoading
                    ? editingQuestId
                      ? "저장하는 중..."
                      : "추가하는 중..."
                    : editingQuestId
                      ? "반복 미션 저장하기"
                      : "반복 미션 추가하기"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeQuests.map((quest) => {
          const checked = completedIds.has(quest.id);
          const doneCount = membersCompletedCount(quest.id);

          return (
            <div
              key={quest.id}
              className={`quest-card ${checked ? "checked" : ""} ${pendingQuestId === quest.id ? "pending" : ""}`}
              onClick={() => {
                if (!pendingQuestId) {
                  toggle(quest.id);
                }
              }}
            >
              <div className="quest-checkbox">
                <Check className="check-svg" size={13} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="quest-name">{quest.title}</div>
                <div className="quest-sub">
                  {checked
                    ? "오늘 완료했어요"
                    : quest.description || "아직 완료하지 않았어요"}
                </div>
              </div>
              {isLeader && (
                <div
                  className="quest-actions"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="quest-action-btn"
                    onClick={() => handleStartEditQuest(quest)}
                    aria-label="반복 미션 수정"
                    title="반복 미션 수정"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="quest-action-btn danger"
                    onClick={() => handleDeleteQuest(quest)}
                    aria-label="반복 미션 삭제"
                    title="반복 미션 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div className="member-strip-header">
          <div className="section-label">오늘 멤버 현황</div>
          <div className="member-strip-total">총 {totalMembers}명</div>
        </div>

        <MemberStatusStrip
          members={members}
          currentMemberId={currentMember.id}
          activeQuestCount={activeQuests.length}
          todayCompletions={todayCompletions}
          memberStatuses={todayMemberStatuses}
          selectedMemberId={selectedMemberId}
          onSelectMember={(member) => {
            if (member.id === currentMember.id) {
              setSelectedMemberId(null);
              return;
            }
            setSelectedMemberId((prev) =>
              prev === member.id ? null : member.id,
            );
          }}
        />

        {selectedMember && selectedMember.id !== currentMember.id && (
          <div className="member-detail-card">
            <div className="member-detail-title">
              {selectedMember.nickname}의 오늘 미션
            </div>
            <div className="member-detail-sub">
              {selectedMemberStatus
                ? `${memberStatusLabel(selectedMemberStatus.status)} · ${selectedMemberStatus.completedQuestCount}/${selectedMemberStatus.totalActiveQuestCount}`
                : `완료 ${selectedMemberCompletionIds.size}/${activeQuests.length}`}
            </div>

            <div className="member-detail-list">
              {activeQuests.map((quest) => {
                const done = selectedMemberCompletionIds.has(quest.id);
                return (
                  <div
                    key={quest.id}
                    className={`member-detail-item ${done ? "done" : ""}`}
                  >
                    <div className="member-detail-item-main">
                      <div className="member-detail-item-title">
                        {quest.title}
                      </div>
                      <div className="member-detail-item-desc">
                        {done ? "완료했어요" : "아직 완료하지 않았어요"}
                      </div>
                    </div>
                    <div
                      className={`member-detail-badge ${done ? "done" : ""}`}
                    >
                      {done ? "완료" : "미완료"}
                    </div>
                  </div>
                );
              })}
            </div>

            {isLeader && selectedMember.role !== "leader" && (
              <div className="member-detail-actions">
                {kickError && (
                  <div className="error-msg member-detail-error">
                    {kickError.message}
                  </div>
                )}
                <button
                  className="member-kick-btn"
                  type="button"
                  disabled={kickLoading}
                  onClick={handleKickMember}
                >
                  {kickLoading ? "내보내는 중..." : "이 멤버 내보내기"}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ height: 4 }} />
      </div>
    </div>
  );
}
