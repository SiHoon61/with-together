import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { decodeAccessBundle } from "../lib/accessTransfer";

export default function AccessImport({ onNavigate }) {
  const { importAccessBundle } = useAuth();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    try {
      const hash = new URL(window.location.href).hash;
      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const encodedBundle = params.get("bundle");
      if (!encodedBundle) {
        setState({ status: "error" });
        return;
      }

      const bundle = decodeAccessBundle(encodedBundle);
      importAccessBundle(bundle);
      onNavigate("home");
    } catch {
      setState({ status: "error" });
    }
  }, [importAccessBundle, onNavigate]);

  if (state.status === "loading") {
    return (
      <div className="center-msg">
        <div className="spinner" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="center-msg">
        <div className="center-msg-text error">접근 정보를 가져오지 못했어요</div>
        <div className="center-msg-sub">링크가 손상됐거나 만료되었을 수 있어요.</div>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate("home")}>
          메인으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="center-msg">
      <div className="spinner" />
    </div>
  );
}
