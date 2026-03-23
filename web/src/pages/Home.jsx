import { useEffect, useMemo, useState } from "react";
import GlobalTopBar from "../components/GlobalTopBar";
import { useAuth } from "../context/AuthContext";
import { getRoomDashboard, listRooms } from "../lib/api";

function RoomCard({ room, subtitle, onClick, tone = "default" }) {
  return (
    <button
      type="button"
      className={`landing-room-card ${tone}`}
      onClick={onClick}
    >
      <div className="landing-room-top">
        <div className="landing-room-name">{room.name}</div>
        <div className="landing-room-meta">{room.memberCount}명</div>
      </div>
      <div className="landing-room-goal">{room.finalGoal}</div>
      <div className="landing-room-footer">{subtitle}</div>
    </button>
  );
}

export default function Home({ onNavigate }) {
  const { accessibleRoomIds, getRoomAccess, lastRoomId, logoutRoom } =
    useAuth();
  const [accessibleRooms, setAccessibleRooms] = useState([]);
  const [accessibleLoading, setAccessibleLoading] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAccessibleRooms() {
      if (accessibleRoomIds.length === 0) {
        setAccessibleRooms([]);
        return;
      }

      try {
        setAccessibleLoading(true);
        const results = await Promise.all(
          accessibleRoomIds.map(async (roomId) => {
            try {
              const data = await getRoomDashboard(roomId);
              return {
                roomId,
                room: data.room,
                currentMember: data.currentMember,
              };
            } catch (e) {
              if (e?.status === 401) {
                logoutRoom(roomId);
              }
              return null;
            }
          }),
        );

        if (!cancelled) {
          const nextRooms = results.filter(Boolean);
          nextRooms.sort((a, b) => {
            if (a.roomId === lastRoomId) return -1;
            if (b.roomId === lastRoomId) return 1;
            return 0;
          });
          setAccessibleRooms(nextRooms);
        }
      } finally {
        if (!cancelled) setAccessibleLoading(false);
      }
    }

    fetchAccessibleRooms();
    return () => {
      cancelled = true;
    };
  }, [accessibleRoomIds, lastRoomId, logoutRoom]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPublicRooms() {
      try {
        setPublicLoading(true);
        const data = await listRooms();
        if (!cancelled) {
          setPublicRooms(data.rooms ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setPublicLoading(false);
      }
    }

    fetchPublicRooms();
    return () => {
      cancelled = true;
    };
  }, []);

  const accessibleRoomIdSet = useMemo(
    () => new Set(accessibleRoomIds),
    [accessibleRoomIds],
  );

  const joinablePublicRooms = publicRooms.filter(
    (room) => !accessibleRoomIdSet.has(room.id),
  );
  const accessRoomId = lastRoomId ?? accessibleRoomIds[0] ?? null;

  return (
    <div className="page-shell">
      <GlobalTopBar
        leftMode="brand"
        active="home"
        showAccessButton={Boolean(accessRoomId)}
        onAccess={() => {
          if (accessRoomId) {
            onNavigate("access", { roomId: accessRoomId });
          }
        }}
      />
      <div className="scroll-area landing-wrap room-content-scroll">
        <div className="landing-hero">
          <div className="main-title">
            같이 하면,
            <br /> 매일이 달라져요
          </div>
          <div className="main-sub">
            혼자서는 어려운 루틴도 함께라면 매일 이어갈 수 있어요
          </div>
          <button className="btn-primary" onClick={() => onNavigate("create")}>
            방 생성하기
          </button>
        </div>

        <div className="section-label">가입된 방</div>

        {accessibleLoading && (
          <div className="center-msg">
            <div className="spinner" />
          </div>
        )}

        {!accessibleLoading && accessibleRooms.length === 0 && (
          <div className="landing-empty-card">
            <div className="center-msg-text">아직 접근 가능한 방이 없어요</div>
            <div className="center-msg-sub">
              초대 링크로 참여하거나 새 방을 만들어 보세요.
            </div>
          </div>
        )}

        {accessibleRooms.map(({ room, currentMember }) => (
          <RoomCard
            key={room.id}
            room={room}
            subtitle={`${currentMember.nickname}으로 참여 중 · 목표 마감일 ${room.finalGoalDate}`}
            tone="owned"
            onClick={() => onNavigate("dashboard", { roomId: room.id })}
          />
        ))}

        <div className="section-label">전체 방 목록</div>

        {publicLoading && (
          <div className="center-msg">
            <div className="spinner" />
          </div>
        )}

        {error && <div className="error-msg">{error.message}</div>}

        {!publicLoading && joinablePublicRooms.length === 0 && (
          <div className="landing-empty-card">
            <div className="center-msg-text">참여 가능한 방이 없어요</div>
            <div className="center-msg-sub">
              새로운 목표방을 직접 만들어 보세요.
            </div>
          </div>
        )}

        {joinablePublicRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            subtitle={`목표 마감일 ${room.finalGoalDate}`}
            onClick={() =>
              onNavigate("join", { inviteToken: room.inviteToken })
            }
          />
        ))}
      </div>
    </div>
  );
}
