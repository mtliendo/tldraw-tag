"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { POWER_UPS, avatarById, formatTime, phaseStatus, type PowerId } from "@inkt/shared";
import { useGameRoom } from "@/hooks/useGameRoom";
import { GameCanvas } from "@/components/GameCanvas";
import { QrPanel } from "@/components/QrPanel";
import { Leaderboard } from "@/components/Leaderboard";
import { PlayAgain } from "@/components/PlayAgain";
import { AvatarGlyph } from "@/components/AvatarGlyph";
import { joinUrl } from "@/lib/colyseus";
import { isItCallout } from "@/game/callouts";

export default function ScreenPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code || "").toUpperCase();
  const [adminToken, setAdminToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fetch("/api/admin/token")
      .then(async (res) => {
        if (!live) return;
        const body = await res.json().catch(() => ({}));
        const token = body.isAdmin && typeof body.token === "string" ? body.token : null;
        setAdminToken(token);
      })
      .catch(() => {
        if (live) setAdminToken(null);
      });
    return () => {
      live = false;
    };
  }, []);
  const isHost = Boolean(adminToken);
  const { view, error, announce, admin } = useGameRoom({
    role: isHost ? "admin" : "spectator",
    code,
    accessToken: adminToken,
    enabled: Boolean(code) && adminToken !== undefined,
  });
  const it = view.players.find((p) => p.isIt);
  const itAvatar = avatarById(it?.avatar);
  const itPower = it?.powerId ? POWER_UPS[it.powerId as PowerId] : null;
  const ended = view.phase === "ended";
  const callout = announce && !isItCallout(announce) ? announce : "";
  const seenJoins = useRef(new Set<string>());
  const [joinFlash, setJoinFlash] = useState<string | null>(null);
  const playerIds = view.players.map((p) => p.id).join(",");

  useEffect(() => {
    const fresh = view.players.filter((p) => !seenJoins.current.has(p.id));
    if (seenJoins.current.size === 0) {
      for (const p of view.players) seenJoins.current.add(p.id);
      return;
    }
    if (fresh.length === 0) return;
    for (const p of fresh) seenJoins.current.add(p.id);
    const names = fresh.map((p) => p.name).join(", ");
    setJoinFlash(`${names} joined`);
    const t = window.setTimeout(() => setJoinFlash(null), 2200);
    return () => window.clearTimeout(t);
  }, [playerIds]);

  return (
    <main
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 280px",
        background: "var(--paper)",
      }}
    >
      <section style={{ position: "relative", minWidth: 0, minHeight: 0, height: "100%" }}>
        <GameCanvas view={view} interactive labelScale={1.5} followZone />

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
            {ended ? "final" : formatTime(view.timeLeft)}
          </div>
          <div className="chip" style={{ fontSize: 18, width: "fit-content" }}>
            {phaseStatus(view)}
          </div>
        </div>

        {!ended && (
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
                    border: "1.5px solid var(--ink)",
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
            {callout && (
              <div className="chip sticky-note" style={{ marginTop: 10, fontSize: 22 }}>
                {callout}
              </div>
            )}
            {joinFlash && (
              <div className="chip sticky-note" style={{ marginTop: 10, fontSize: 20 }}>
                {joinFlash}
              </div>
            )}
          </div>
        )}

        {ended && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              justifyItems: "center",
              gap: 16,
              padding: "28px 24px",
              zIndex: 9,
              background: "rgba(247,249,251,0.55)",
            }}
          >
            <Leaderboard view={view} overlay />
            <PlayAgain canHost={isHost} onPlayAgain={() => admin("playAgain")} />
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
          borderLeft: "1.5px solid var(--ink)",
          background: "#fff",
        }}
      >
        <QrPanel value={joinUrl(code)} code={view.code || code} projector />
      </aside>
    </main>
  );
}
