"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { POWER_UPS, assignedCritterLine, avatarTintIndex, type PowerId } from "@inkt/shared";
import { CritterThumb } from "@/components/Critter";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useKeyboard } from "@/hooks/useKeyboard";
import { GameCanvas } from "@/components/GameCanvas";
import { Joystick } from "@/components/Joystick";
import { PowerButton } from "@/components/PowerButton";
import { TopHud } from "@/components/TopHud";
import { Leaderboard } from "@/components/Leaderboard";
import { Minimap } from "@/components/Minimap";
import { isItCallout } from "@/game/callouts";

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();
  const [identity, setIdentity] = useState<{ name: string } | null>(null);
  const [mobile, setMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800),
  );

  useEffect(() => {
    const raw = sessionStorage.getItem(`inkt:${code}`);
    if (!raw) {
      router.replace(`/join/${code}`);
      return;
    }
    setIdentity(JSON.parse(raw));
    const apply = () => {
      const mq = window.matchMedia("(pointer: coarse)");
      setMobile(mq.matches || window.innerWidth < 800);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [code, router]);

  const { view, connected, error, sessionId, announce, sendInput, usePower } = useGameRoom({
    role: "player",
    code,
    name: identity?.name,
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
  const callout = announce && !isItCallout(announce) ? announce : "";

  if (!identity) return null;

  return (
    <main
      style={{
        height: "100dvh",
        display: "grid",
        gridTemplateRows: mobile ? "auto minmax(0, 1fr) auto" : "1fr",
      }}
    >
      {mobile && (
        <div
          style={{
            padding: "8px 12px 6px",
            zIndex: 6,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <TopHud view={view} selfPower={me ? { id: me.powerId, charges: me.charges } : undefined} />
            {callout && (
              <div className="chip sticky-note" style={{ marginTop: 8 }}>
                {callout}
              </div>
            )}
          </div>
          {view.phase !== "ended" && <Minimap view={view} selfId={me?.id} compact />}
        </div>
      )}
      <section style={{ position: "relative", minHeight: 0 }}>
        {!mobile && (
          <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 6 }}>
            <TopHud view={view} selfPower={me ? { id: me.powerId, charges: me.charges } : undefined} />
            {callout && (
              <div className="chip sticky-note" style={{ marginTop: 8 }}>
                {callout}
              </div>
            )}
          </div>
        )}
        {error && (
          <div style={{ position: "absolute", top: 80, left: 16, zIndex: 8, color: "var(--it)" }}>{error}</div>
        )}
        <GameCanvas
          view={view}
          selfId={me?.id}
          followZone={!mobile}
          followPlayer={mobile}
          labelScale={mobile ? 1.45 : 1}
        />
        {view.phase === "lobby" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, zIndex: 6 }}>
            <div className="panel" style={{ padding: 22, textAlign: "center", minWidth: 240 }}>
              <div className="kicker">Lobby {code}</div>
              {me && (
                <>
                  <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 6px" }}>
                    <CritterThumb
                      avatar={me.avatar}
                      size={96}
                      tint={avatarTintIndex(view.players, me.id, me.avatar)}
                    />
                  </div>
                  <h2 style={{ fontSize: 28 }}>{assignedCritterLine(me.avatar)}</h2>
                </>
              )}
              <p className="muted" style={{ margin: "8px 0 0" }}>
                Waiting for the admin to start
              </p>
              <p className="muted">
                {view.players.length} in the room{connected ? "" : " · connecting"}
              </p>
            </div>
          </div>
        )}
        {view.phase === "ended" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: mobile ? 10 : 24,
              zIndex: 9,
              background: "color-mix(in srgb, var(--page) 78%, transparent)",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <Leaderboard view={view} overlay compact={mobile} />
          </div>
        )}
      </section>
      {mobile && (
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 14px 10px",
            background: "#fff",
            borderTop: "1.5px solid var(--line)",
            minHeight: 176,
          }}
        >
          <Joystick
            onChange={sendInput}
            compact
            avatar={me?.avatar}
            tint={me ? avatarTintIndex(view.players, me.id, me.avatar) : 0}
          />
          <PowerButton powerId={me?.powerId ?? ""} charges={me?.charges ?? 0} onUse={usePower} compact />
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
