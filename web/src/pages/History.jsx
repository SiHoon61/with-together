import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import GlobalTopBar from "../components/GlobalTopBar";
import LocalSegmentTabs from "../components/LocalSegmentTabs";
import MemberStatusStrip from "../components/MemberStatusStrip";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import { useHorizontalSwipe } from "../hooks/useHorizontalSwipe";
import { useMonthlyRoomStatus } from "../hooks/useMonthlyRoomStatus";
import { dailyRoomStatusQueryOptions } from "../lib/queryOptions";

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

function buildCalendar(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function memberStatusLabel(status) {
  if (status === "perfect") return "목표 완벽 달성";
  if (status === "goal_met") return "목표 달성";
  return "목표 미달성";
}

function buildDateString(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function History({ roomId, onNavigate }) {
  const { getRoomAccess, markRoomVisited } = useAuth();
  const roomAccess = getRoomAccess(roomId);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    now.toISOString().slice(0, 10),
  );
  const swipeHandlers = useHorizontalSwipe({
    onSwipeRight: () => onNavigate("dashboard", { roomId }),
  });

  const { data: dashData } = useDashboard(roomId);
  const roomStartDate = dashData?.room?.createdAt?.slice(0, 10) ?? null;
  const roomEndDate = dashData?.room?.finalGoalDate ?? null;
  const totalQuests =
    dashData?.recurringQuests.filter((q) => q.isActive).length ?? 0;
  const todayStr = dashData?.todayDate ?? now.toISOString().slice(0, 10);
  const { dayStatusMap, loading } = useMonthlyRoomStatus(
    roomId,
    year,
    month,
    todayStr,
  );
  const dailyStatusQuery = useQuery(
    dailyRoomStatusQueryOptions(roomId, selectedDate),
  );

  useEffect(() => {
    if (roomId && roomAccess) {
      markRoomVisited(roomId);
    }
  }, [roomId, roomAccess, markRoomVisited]);

  useEffect(() => {
    const selectedYear = Number(String(selectedDate).slice(0, 4));
    const selectedMonth = Number(String(selectedDate).slice(5, 7));

    if (selectedYear === year && selectedMonth === month) {
      return;
    }

    if (year === currentYear && month === currentMonth) {
      setSelectedDate(todayStr);
      return;
    }

    setSelectedDate(`${year}-${String(month).padStart(2, "0")}-01`);
  }, [currentMonth, currentYear, month, selectedDate, todayStr, year]);

  if (!roomAccess) {
    return (
      <div className="center-msg">
        <div className="center-msg-text">이 방에 접근할 수 없어요</div>
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

  const selectedStatusData = dailyStatusQuery.data ?? {
    members: dashData?.members ?? [],
    recurringQuests: dashData?.recurringQuests ?? [],
    completions: dashData?.todayCompletions ?? [],
    memberStatuses: dashData?.todayMemberStatuses ?? [],
  };
  const memberStatuses = selectedStatusData.memberStatuses ?? [];
  const selectedMembers = selectedStatusData.members ?? [];
  const totalMembers = memberStatuses.length;
  const passedMembers = memberStatuses.filter(
    (memberStatus) =>
      memberStatus.status === "goal_met" || memberStatus.status === "perfect",
  ).length;
  const passRate =
    totalMembers > 0 ? Math.round((passedMembers / totalMembers) * 100) : 0;
  const activeQuests = (selectedStatusData.recurringQuests ?? []).filter(
    (quest) => quest.isActive,
  );
  const selectedMember =
    selectedMembers.find((member) => member.id === selectedMemberId) ?? null;
  const selectedMemberStatus =
    memberStatuses.find((status) => status.memberId === selectedMemberId) ??
    null;
  const selectedMemberCompletionIds = new Set(
    (selectedStatusData.completions ?? [])
      .filter((completion) => completion.memberId === selectedMemberId)
      .map((completion) => completion.questId),
  );

  const cells = buildCalendar(year, month);

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    const nextY = month === 12 ? year + 1 : year;
    const nextM = month === 12 ? 1 : month + 1;
    setYear(nextY);
    setMonth(nextM);
  }

  function dayClass(day) {
    if (!day) return "cal-day empty";
    const dateStr = buildDateString(year, month, day);
    const isToday = dateStr === todayStr;
    const status = dayStatusMap[dateStr];
    const isInRange =
      (!roomStartDate || dateStr >= roomStartDate) &&
      (!roomEndDate || dateStr <= roomEndDate);
    let cls = "cal-day";
    cls += isInRange ? " in-range" : " out-range";
    if (isToday) cls += " today";
    if (dateStr === selectedDate) cls += " selected";
    if (status === "full") cls += " full";
    return cls;
  }

  return (
    <div className="page-shell" {...swipeHandlers}>
      <GlobalTopBar
        onHome={() => onNavigate("home")}
        onAccess={() => onNavigate("access", { roomId })}
      />
      <LocalSegmentTabs
        active="history"
        onChange={(id) => {
          if (id === "quest") onNavigate("dashboard", { roomId });
        }}
      />
      <div className="scroll-area room-content-scroll">
        <div className="cal-header">
          <div className="cal-title">
            {year}년 {month}월
          </div>
          <div className="cal-nav-row">
            <button className="cal-nav-btn" onClick={prevMonth}>
              ‹
            </button>
            <button className="cal-nav-btn" onClick={nextMonth}>
              ›
            </button>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "40px 0",
            }}
          >
            <div className="spinner" />
          </div>
        ) : (
          <div className="cal-grid">
            {DAYS_KO.map((d) => (
              <div key={d} className="cal-day-header">
                {d}
              </div>
            ))}
            {cells.map((day, idx) => (
              <button
                key={idx}
                type="button"
                className={dayClass(day)}
                disabled={!day}
                onClick={() => {
                  if (!day) return;
                  setSelectedDate(buildDateString(year, month, day));
                }}
              >
                {day ? (
                  <>
                    <span className="cal-day-number">{day}</span>
                    {dayStatusMap[buildDateString(year, month, day)] ===
                      "full" && (
                      <span className="cal-day-check" aria-hidden="true">
                        <Check size={14} strokeWidth={2.4} />
                      </span>
                    )}
                  </>
                ) : (
                  ""
                )}
              </button>
            ))}
          </div>
        )}

        <div className="stat-row stat-row-single">
          <div className="stat-box">
            <div className="stat-num">{passRate}%</div>
            <div className="stat-unit">
              {selectedDate} · {totalMembers}명중 {passedMembers}명이 통과
            </div>
          </div>
        </div>

        {dashData && (
          <>
            <div className="member-strip-header">
              <div className="section-label">멤버 현황</div>
                <div className="member-strip-total">
                총 {selectedMembers.length}명
              </div>
            </div>
            <MemberStatusStrip
              members={selectedMembers}
              currentMemberId={dashData.currentMember.id}
              activeQuestCount={activeQuests.length || totalQuests}
              todayCompletions={selectedStatusData.completions}
              memberStatuses={memberStatuses}
              selectedMemberId={selectedMemberId}
              onSelectMember={(member) => {
                setSelectedMemberId((prev) =>
                  prev === member.id ? null : member.id,
                );
              }}
            />

            {selectedMember && (
              <div className="member-detail-card">
                <div className="member-detail-title">
                  {selectedMember.nickname}의 미션
                </div>
                <div className="member-detail-sub">
                  {selectedMemberStatus
                    ? `${selectedDate} · ${memberStatusLabel(selectedMemberStatus.status)} · ${selectedMemberStatus.completedQuestCount}/${selectedMemberStatus.totalActiveQuestCount}`
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
