"use client";

import { useParams } from "next/navigation";
import { useGameRoom } from "@/hooks/useGameRoom";
import { GameCanvas } from "@/components/GameCanvas";
import { QrPanel } from "@/components/QrPanel";
import { TopHud } from "@/components/TopHud";
import { Leaderboard } from "@/components/Leaderboard";
import { joinUrl } from "@/lib/colyseus";
import { formatTime } from "@inkt/shared";

export default function ScreenPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code || "").toUpperCase();
  const { view, error, announce } = useGameRoom({
    role: "spectator",
    code,
    enabled: Boolean(code),
  });

  return (
    <main style={{ height: "100vh", position: "relative", background: "#05060b" }}>
      <div style={{ position: "absolute", top: 18, left: 18, right: 220, zIndex: 6, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div className="display" style={{ fontSize: 28, letterSpacing: "0.2em" }}>
            INK TAG
          </div>
          <TopHud view={view} />
        </div>
        {announce && (
          <div className="chip" style={{ fontSize: 22, background: "rgba(255,45,123,0.22)" }}>
            {announce}
          </div>
        )}
      </div>
      <GameCanvas view={view} />
      <div style={{ position: "absolute", right: 16, bottom: 16, zIndex: 6 }}>
        <QrPanel value={joinUrl(code)} code={view.code || code} compact />
      </div>
      {view.phase === "playing" && (
        <div
          style={{
            position: "absolute",
            left: 18,
            bottom: 18,
            zIndex: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 64,
            letterSpacing: 4,
          }}
        >
          {formatTime(view.timeLeft)}
        </div>
      )}
      {view.phase === "ended" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 8, background: "rgba(5,6,11,0.35)" }}>
          <Leaderboard view={view} overlay />
        </div>
      )}
      {error && (
        <div className="panel" style={{ position: "absolute", top: 90, left: 18, padding: 12, zIndex: 9 }}>
          {error}
        </div>
      )}
    </main>
  );
}
