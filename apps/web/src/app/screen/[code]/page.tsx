"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { POWER_UPS, avatarTintIndex, formatTime, phaseStatus, type PowerId } from "@inkt/shared";
import { useGameRoom } from "@/hooks/useGameRoom";
import { GameCanvas } from "@/components/GameCanvas";
import { QrPanel } from "@/components/QrPanel";
import { Leaderboard } from "@/components/Leaderboard";
import { PlayAgain } from "@/components/PlayAgain";
import { CritterThumb } from "@/components/Critter";
import { PowerGlyph } from "@/components/PowerGlyph";
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
        gridTemplateColumns: "minmax(0, 1fr) 252px",
        background: "var(--page)",
      }}
    >
      <section style={{ position: "relative", minWidth: 0, minHeight: 0, height: "100%" }}>
        <GameCanvas view={view} interactive labelScale={1.5} followZone />

        <div style={{ position: "absolute", top: 18, left: 24, zIndex: 6 }}>
          <div className="display" style={{ fontSize: 20 }}>
            ink tag
          </div>
          <div
            className="display"
            style={{
              fontSize: 64,
              lineHeight: 1,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {ended ? "final" : formatTime(view.timeLeft)}
          </div>
          <div className="chip" style={{ marginTop: 8, width: "fit-content" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--safe)",
                boxShadow: "0 0 0 3px color-mix(in srgb, var(--safe) 25%, transparent)",
              }}
            />
            {phaseStatus(view)}
            {view.players.length ? ` · ${view.players.length} players` : ""}
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
              className="panel it-chip"
              style={{
                padding: "12px 20px 12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                borderRadius: 14,
              }}
            >
              {it && (
                <CritterThumb
                  avatar={it.avatar}
                  size={56}
                  isIt
                  tint={avatarTintIndex(view.players, it.id, it.avatar)}
                />
              )}
              <div>
                <div className="kicker" style={{ color: "var(--it)" }}>
                  currently it
                </div>
                <div className="display" style={{ fontSize: 30, lineHeight: 1.1 }}>
                  {view.itName || "Waiting"}
                </div>
                {itPower && (
                  <div className="muted" style={{ fontWeight: 600, fontSize: 15 }}>
                    holding {itPower.label}
                  </div>
                )}
              </div>
            </div>
            {callout && (
              <div className="chip sticky-note" style={{ marginTop: 10, fontSize: 18 }}>
                {callout}
              </div>
            )}
            {joinFlash && (
              <div className="chip sticky-note" style={{ marginTop: 10, fontSize: 18 }}>
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
              background: "color-mix(in srgb, var(--page) 82%, transparent)",
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
          gap: 16,
          padding: 16,
          borderLeft: "1.5px solid var(--line)",
          background: "var(--page)",
          overflow: "auto",
        }}
      >
        <QrPanel value={joinUrl(code)} code={view.code || code} projector />
        {!ended && (
          <div className="panel" style={{ padding: 18 }}>
            <div className="kicker">zone shrinks in</div>
            <div className="display" style={{ fontSize: 26, marginTop: 6 }}>
              {view.shrinking ? "now" : formatTime(view.shrinkIn)}
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 99,
                background: "var(--hair)",
                margin: "12px 0 8px",
                overflow: "hidden",
              }}
            >
              <i
                style={{
                  display: "block",
                  height: "100%",
                  width: `${Math.max(8, Math.min(100, (1 - view.shrinkIn / Math.max(1, view.roundLength)) * 100))}%`,
                  background: "var(--zone)",
                  borderRadius: 99,
                }}
              />
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {view.players.length} on the board
            </div>
          </div>
        )}
        <div className="panel" style={{ padding: 18 }}>
          <div className="kicker" style={{ marginBottom: 10 }}>
            powers
          </div>
          {Object.values(POWER_UPS).map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontWeight: 600,
                fontSize: 15,
                padding: "4px 0",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: p.color,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid var(--line)",
                }}
              >
                <PowerGlyph icon={p.icon} color={p.ink} size={14} />
              </span>
              {p.label}
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
