"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { POWER_IDS, POWER_UPS, DEFAULT_ROUND_LENGTH, type PowerId } from "@inkt/shared";
import { useGameRoom } from "@/hooks/useGameRoom";
import { GameCanvas } from "@/components/GameCanvas";
import { QrPanel } from "@/components/QrPanel";
import { TopHud } from "@/components/TopHud";
import { Leaderboard } from "@/components/Leaderboard";
import { PlayAgain } from "@/components/PlayAgain";
import { joinUrl, screenUrl } from "@/lib/colyseus";

export function AdminDesk({
  token,
  mode,
  userName,
}: {
  token: string;
  mode: string;
  userName?: string;
}) {
  const params = useSearchParams();
  const botParam = Number(params.get("bots") || process.env.NEXT_PUBLIC_DEFAULT_BOTS || 0);
  const roundParam = Number(params.get("round") || 0);
  const shrinkParam = Number(params.get("shrink") || 0);
  const [roundLength, setRoundLength] = useState(roundParam || DEFAULT_ROUND_LENGTH);
  const [shrinkInterval, setShrinkInterval] = useState(shrinkParam || 10);
  const [enabled, setEnabled] = useState<Record<PowerId, boolean>>(() =>
    Object.fromEntries(POWER_IDS.map((id) => [id, true])) as Record<PowerId, boolean>,
  );
  const [created, setCreated] = useState(false);
  const [bots, setBots] = useState(botParam || 0);

  const enabledPowers = useMemo(
    () => POWER_IDS.filter((id) => enabled[id]),
    [enabled],
  );

  const { view, connected, error, admin } = useGameRoom({
    role: "admin",
    create: true,
    accessToken: created ? token : null,
    bots: bots || undefined,
    roundLength,
    shrinkInterval,
    enabledPowers,
    enabled: created,
  });

  const code = view.code;
  const join = code ? joinUrl(code) : "";

  return (
    <main style={{ height: "100vh", display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)" }}>
      <aside style={{ padding: 20, borderRight: "1px solid var(--line)", overflow: "auto" }}>
        <div className="kicker">Admin · {mode}</div>
        <h1 style={{ fontSize: 42, margin: "6px 0 4px" }}>INK TAG</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          {userName ? `Signed in as ${userName}` : "Local demo mode"}
        </p>

        {!created ? (
          <>
            <label className="kicker">Round length (seconds)</label>
            <input
              type="range"
              min={15}
              max={180}
              value={roundLength}
              onChange={(e) => setRoundLength(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ marginBottom: 12 }}>{roundLength}s</div>

            <label className="kicker">Shrink every</label>
            <input
              type="range"
              min={6}
              max={20}
              value={shrinkInterval}
              onChange={(e) => setShrinkInterval(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ marginBottom: 12 }}>{shrinkInterval}s</div>

            <label className="kicker">Bots</label>
            <input
              type="number"
              min={0}
              max={24}
              value={bots}
              onChange={(e) => setBots(Number(e.target.value))}
              className="sketch-input"
              style={{ width: "100%", marginBottom: 16, padding: 8 }}
            />

            <div className="kicker">Power-ups</div>
            <div style={{ display: "grid", gap: 8, margin: "10px 0 18px" }}>
              {POWER_IDS.map((id) => (
                <label key={id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={enabled[id]}
                    onChange={(e) => setEnabled((s) => ({ ...s, [id]: e.target.checked }))}
                  />
                  <span
                    style={{
                      background: POWER_UPS[id].color,
                      color: POWER_UPS[id].ink,
                      fontWeight: 700,
                      padding: "1px 8px",
                      border: "1.5px solid var(--line)",
                    }}
                  >
                    {POWER_UPS[id].label}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {POWER_UPS[id].description}
                  </span>
                </label>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => setCreated(true)}>
              Create game
            </button>
          </>
        ) : (
          <>
            {error && <p style={{ color: "var(--it)" }}>{error}</p>}
            <p className="muted">{connected ? "Room live" : "Connecting…"}</p>
            {code && <QrPanel value={join} code={code} />}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
              {view.phase === "ended" ? (
                <PlayAgain canHost onPlayAgain={() => admin("playAgain")} />
              ) : (
                <button className="btn btn-it" onClick={() => admin("start")} disabled={view.phase === "playing"}>
                  Start
                </button>
              )}
              {view.phase === "playing" ? (
                <button className="btn btn-ghost" onClick={() => admin("pause")}>
                  Pause
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={() => admin("resume")} disabled={view.phase !== "paused"}>
                  Resume
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => admin("reset")}>
                Reset
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" onClick={() => admin("spawnBots", { count: 10 })}>
                +10 bots
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => admin("showcase")}
                disabled={view.phase !== "playing"}
              >
                Showcase
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => admin("pinArt")}
                disabled={view.phase !== "playing"}
              >
                Pin art
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => admin("pinArt", { minZone: true })}
                disabled={view.phase !== "playing"}
              >
                Pin min zone
              </button>
              {code && (
                <a className="btn btn-ghost" href={screenUrl(code)} target="_blank" rel="noreferrer">
                  Projector
                </a>
              )}
            </div>
            <div className="kicker" style={{ marginTop: 18 }}>
              Players ({view.players.length})
            </div>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {view.players.map((p) => (
                <li key={p.id} style={{ padding: "6px 0", color: p.isIt ? "var(--it)" : "inherit" }}>
                  {p.name}
                  {p.isBot ? " · bot" : ""}
                  {p.isIt ? " · IT" : ""}
                </li>
              ))}
            </ul>
            {mode === "auth0" && (
              <a className="muted" href="/auth/logout" style={{ display: "inline-block", marginTop: 16 }}>
                Log out
              </a>
            )}
          </>
        )}
      </aside>
      <section style={{ position: "relative", minWidth: 0, minHeight: 0, height: "100%" }}>
        {created ? (
          <>
            <div style={{ position: "absolute", top: 16, left: 16, zIndex: 6 }}>
              <TopHud view={view} />
            </div>
            <GameCanvas view={view} followZone />
            {view.phase === "ended" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  justifyItems: "center",
                  gap: 16,
                  padding: 48,
                  zIndex: 9,
                  background: "color-mix(in srgb, var(--page) 78%, transparent)",
                }}
              >
                <Leaderboard view={view} overlay />
                <PlayAgain canHost onPlayAgain={() => admin("playAgain")} />
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%", padding: 40 }}>
            <div>
              <div className="kicker">Conference demo</div>
              <h2 style={{ fontSize: 56 }}>Create a room, project the board, let the phones in.</h2>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
