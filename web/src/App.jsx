import { useEffect, useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import JoinRoom from "./pages/JoinRoom";
import CreateRoom from "./pages/CreateRoom";
import History from "./pages/History";
import Members from "./pages/Members";
import AccessTransfer from "./pages/AccessTransfer";
import AccessImport from "./pages/AccessImport";
import InAppBrowserBanner from "./components/InAppBrowserBanner";
import "./styles.css";

function parseLocation() {
  const { pathname } = window.location;
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "join" && segments[1]) {
    return { screen: "join", inviteToken: segments[1] };
  }

  if (segments[0] === "create") return { screen: "create" };
  if (segments[0] === "access-import") return { screen: "accessImport" };

  if (segments[0] === "rooms" && segments[1]) {
    const roomId = segments[1];
    if (segments[2] === "history") return { screen: "history", roomId };
    if (segments[2] === "access") return { screen: "access", roomId };
    if (segments[2] === "members") return { screen: "members", roomId };
    return { screen: "dashboard", roomId };
  }

  return { screen: "home" };
}

function getPathForRoute(screen, state = {}) {
  switch (screen) {
    case "create":
      return "/create";
    case "join":
      return state.inviteToken ? `/join/${state.inviteToken}` : window.location.pathname;
    case "dashboard":
      return state.roomId ? `/rooms/${state.roomId}` : "/";
    case "history":
      return state.roomId ? `/rooms/${state.roomId}/history` : "/";
    case "members":
      return state.roomId ? `/rooms/${state.roomId}/members` : "/";
    case "access":
      return state.roomId ? `/rooms/${state.roomId}/access` : "/";
    case "accessImport":
      return "/access-import";
    case "home":
    default:
      return "/";
  }
}

function AppInner() {
  const [route, setRoute] = useState(() => parseLocation());

  useEffect(() => {
    function handlePopState() {
      setRoute(parseLocation());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigateTo(screen, state = {}) {
    const nextRoute = {
      screen,
      ...state,
    };
    setRoute(nextRoute);

    const nextPath = getPathForRoute(screen, state);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  return (
    <div className="app-root">
      <div className="phone-frame">
        <InAppBrowserBanner />
        <div className="screen-area">
          {route.screen === "home" && <Home onNavigate={navigateTo} />}
          {route.screen === "dashboard" && (
            <Dashboard roomId={route.roomId} onNavigate={navigateTo} />
          )}
          {route.screen === "create" && <CreateRoom onNavigate={navigateTo} />}
          {route.screen === "join" && (
            <JoinRoom inviteToken={route.inviteToken} onNavigate={navigateTo} />
          )}
          {route.screen === "history" && (
            <History roomId={route.roomId} onNavigate={navigateTo} />
          )}
          {route.screen === "members" && (
            <Members roomId={route.roomId} onNavigate={navigateTo} />
          )}
          {route.screen === "access" && (
            <AccessTransfer roomId={route.roomId} onNavigate={navigateTo} />
          )}
          {route.screen === "accessImport" && (
            <AccessImport onNavigate={navigateTo} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
