import { ArrowLeft, Home, Settings } from "lucide-react";

export default function GlobalTopBar({
  leftMode = "home",
  active = "room",
  onLeft,
  onHome,
  onAccess,
  showAccessButton = true,
}) {
  function renderLeft() {
    if (leftMode === "brand") {
      return <div className="global-topbar-brand">매일같이</div>;
    }

    const isBack = leftMode === "back";
    const label = isBack ? "이전" : "홈";

    return (
      <button
        className={`global-topbar-btn ${active === "home" ? "active" : ""}`}
        type="button"
        onClick={onLeft ?? onHome}
      >
        <span className="global-topbar-btn-icon" aria-hidden="true">
          {isBack ? (
            <ArrowLeft />
          ) : (
            <Home />
          )}
        </span>
        {label}
      </button>
    );
  }

  return (
    <div className="global-topbar">
      {renderLeft()}

      <div className="global-topbar-title" />

      {showAccessButton ? (
        <button
          className={`global-topbar-btn ${active === "access" ? "active" : ""}`}
          type="button"
          onClick={onAccess}
        >
          <span className="global-topbar-btn-icon" aria-hidden="true">
            <Settings />
          </span>
          설정
        </button>
      ) : (
        <div className="global-topbar-spacer" />
      )}
    </div>
  );
}
