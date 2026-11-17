"use client";

import { useParams } from "next/navigation";
import { POWER_UPS, avatarById, formatTime, type PowerId } from "@inkt/shared";
import { useGameRoom } from "@/hooks/useGameRoom";
import { GameCanvas } from "@/components/GameCanvas";
import { QrPanel } from "@/components/QrPanel";
import { Leaderboard } from "@/components/Leaderboard";
import { AvatarGlyph } from "@/components/AvatarGlyph";
import { joinUrl } from "@/lib/colyseus";

export default function ScreenPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code || "").toUpperCase();
  const { view, error, announce } = useGameRoom({
    role: "spectator",
    code,
    enabled: Boolean(code),
  });
  const it = view.players.find((p) => p.isIt);
  const itAvatar = avatarById(it?.avatar);
  const itPower = it?.powerId ? POWER_UPS[it.powerId as PowerId] : null;

  return (
    <main
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 280px",
        background: "var(--paper)",
      }}
    >
      <section style={{ position: "relative", minWidth: 0 }}>
        <GameCanvas view={view} />

        <div
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            zIndex: 6,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div className="display" style={{ fontSize: 22, letterSpacing: "0.08em" }}>
            ink tag
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 96,
              lineHeight: 0.9,
              letterSpacing: 2,
              fontWeight: 800,
            }}
          >
            {view.phase === "ended" ? "final" : formatTime(view.timeLeft)}
          </div>
          <div className="chip" style={{ fontSize: 18, width: "fit-content" }}>
            {view.phase}
            {view.shrinking ? " · zone moving" : view.shrinkIn > 0 && view.shrinkIn <= 3 ? " · zone warning" : ""}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 6,
          }}
        >
          <div
            className="panel"
            style={{
              padding: "14px 28px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "#f87777",
              transform: "rotate(-1deg)",
            }}
          >
            {it && (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "48% 52% 46% 54%",
                  background: itAvatar.color,
                  display: "grid",
                  placeItems: "center",
                  border: "3px solid var(--ink)",
                }}
              >
                <AvatarGlyph glyph={itAvatar.glyph} accent={itAvatar.accent} size={32} />
              </div>
            )}
            <div>
              <div className="kicker" style={{ color: "var(--ink)", fontSize: 14 }}>
                currently it
              </div>
              <div className="display" style={{ fontSize: 42, lineHeight: 1 }}>
                {view.itName || "Waiting"}
              </div>
              {itPower && (
                <div className="muted" style={{ fontWeight: 700 }}>
                  holding {itPower.label}
                </div>
              )}
            </div>
          </div>
          {announce && (
            <div className="chip" style={{ marginTop: 10, fontSize: 22, background: "#FCE19C" }}>
              {announce}
            </div>
          )}
        </div>

        {view.phase === "ended" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 8,
              background: "rgba(247,249,251,0.35)",
            }}
          >
            <Leaderboard view={view} overlay />
          </div>
        )}
        {error && (
          <div className="panel" style={{ position: "absolute", top: 90, left: 18, padding: 12, zIndex: 9 }}>
            {error}
          </div>
        )}
      </section>

      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          borderLeft: "2.5px solid var(--ink)",
          background: "#fff",
        }}
      >
        <QrPanel value={joinUrl(code)} code={view.code || code} projector />
      </aside>
    </main>
  );
}
