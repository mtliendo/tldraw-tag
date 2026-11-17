"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { POWER_UPS, type PowerId } from "@inkt/shared";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useKeyboard } from "@/hooks/useKeyboard";
import { GameCanvas } from "@/components/GameCanvas";
import { Joystick } from "@/components/Joystick";
import { PowerButton } from "@/components/PowerButton";
import { TopHud } from "@/components/TopHud";
import { Leaderboard } from "@/components/Leaderboard";

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();
  const [identity, setIdentity] = useState<{ name: string; avatar: string } | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`inkt:${code}`);
    if (!raw) {
      router.replace(`/join/${code}`);
      return;
    }
    setIdentity(JSON.parse(raw));
    const mq = window.matchMedia("(pointer: coarse)");
    setMobile(mq.matches || window.innerWidth < 800);
  }, [code, router]);

  const { view, connected, error, sessionId, announce, sendInput, usePower } = useGameRoom({
    role: "player",
    code,
    name: identity?.name,
    avatar: identity?.avatar,
    enabled: Boolean(identity),
  });

  useKeyboard({
    enabled: Boolean(identity) && !mobile && view.phase === "playing",
    onMove: sendInput,
    onPower: usePower,
  });

  const me = useMemo(
    () => view.players.find((p) => p.sessionId === sessionId),
    [view.players, sessionId],
  );

  if (!identity) return null;

  return (
    <main style={{ height: "100dvh", display: "grid", gridTemplateRows: mobile ? "1fr 210px" : "1fr" }}>
      <section style={{ position: "relative", minHeight: 0 }}>
        <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 6 }}>
          <TopHud view={view} selfPower={me ? { id: me.powerId, charges: me.charges } : undefined} />
          {announce && (
            <div className="chip" style={{ marginTop: 8, background: "#FCE19C" }}>
              {announce}
            </div>
          )}
        </div>
        {error && (
          <div style={{ position: "absolute", top: 80, left: 16, zIndex: 8, color: "var(--it)" }}>{error}</div>
        )}
        <GameCanvas view={view} selfId={me?.id} />
        {view.phase === "lobby" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "end center", padding: 24, zIndex: 6 }}>
            <div className="panel" style={{ padding: 16, textAlign: "center" }}>
              <div className="kicker">Lobby {code}</div>
              <h2>Waiting for the admin to start</h2>
              <p className="muted">{view.players.length} in the room{connected ? "" : " · connecting"}</p>
            </div>
          </div>
        )}
        {view.phase === "ended" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 7 }}>
            <Leaderboard view={view} overlay />
          </div>
        )}
      </section>
      {mobile && (
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px 40px",
            background: "var(--card)",
            borderTop: "2.5px solid var(--ink)",
          }}
        >
          <Joystick onChange={sendInput} />
          <PowerButton powerId={me?.powerId ?? ""} charges={me?.charges ?? 0} onUse={usePower} />
        </section>
      )}
      {!mobile && (
        <div className="muted" style={{ position: "absolute", bottom: 16, left: 16, zIndex: 6 }}>
          WASD / arrows to move · space to use {me?.powerId ? POWER_UPS[me.powerId as PowerId]?.label : "a power"}
        </div>
      )}
    </main>
  );
}
