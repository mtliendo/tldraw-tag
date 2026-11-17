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
import { LANDSCAPE_BLOB_PX, landscapeFollowPad, readPhoneLayout, type PhoneLayout } from "@/game/phoneLayout";

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();
  const [identity, setIdentity] = useState<{ name: string } | null>(null);
  const [layout, setLayout] = useState<PhoneLayout>(() =>
    typeof window === "undefined" ? { mobile: false, landscape: false, width: 1440, height: 900 } : readPhoneLayout(),
  );

  useEffect(() => {
    const raw = sessionStorage.getItem(`inkt:${code}`);
    if (!raw) {
      router.replace(`/join/${code}`);
      return;
    }
    setIdentity(JSON.parse(raw));
    const apply = () => setLayout(readPhoneLayout());
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    const mq = window.matchMedia("(orientation: landscape)");
    mq.addEventListener?.("change", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      mq.removeEventListener?.("change", apply);
    };
  }, [code, router]);

  const { view, connected, error, sessionId, announce, sendInput, usePower } = useGameRoom({
    role: "player",
    code,
    name: identity?.name,
    enabled: Boolean(identity),
  });

  const { mobile, landscape } = layout;
  const followPad = useMemo(
    () => (landscape ? landscapeFollowPad(layout.width, layout.height) : undefined),
    [landscape, layout.width, layout.height],
  );

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

  const hud = mobile ? (
    <div
      className={landscape ? "play-hud-landscape" : undefined}
      style={
        landscape
          ? undefined
          : {
              padding: "8px 12px 6px",
              zIndex: 6,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            }
      }
    >
      <div
        style={{
          minWidth: 0,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <TopHud
            view={view}
            selfPower={me ? { id: me.powerId, charges: me.charges } : undefined}
            slim={landscape}
          />
          {callout && !landscape && (
            <div className="chip sticky-note" style={{ marginTop: 8 }}>
              {callout}
            </div>
          )}
        </div>
        {view.phase !== "ended" && <Minimap view={view} selfId={me?.id} compact />}
      </div>
    </div>
  ) : null;

  const dock = mobile ? (
    <section
      className={landscape ? "play-dock-landscape" : undefined}
      style={
        landscape
          ? undefined
          : {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 14px 10px",
              background: "#fff",
              borderTop: "1.5px solid var(--line)",
              minHeight: 176,
            }
      }
    >
      <Joystick
        onChange={sendInput}
        compact
        overlay={landscape}
        avatar={me?.avatar}
        tint={me ? avatarTintIndex(view.players, me.id, me.avatar) : 0}
      />
      <PowerButton
        powerId={me?.powerId ?? ""}
        charges={me?.charges ?? 0}
        onUse={usePower}
        compact
        overlay={landscape}
      />
    </section>
  ) : null;

  return (
    <main
      style={{
        height: "100dvh",
        display: "grid",
        gridTemplateRows: mobile && !landscape ? "auto minmax(0, 1fr) auto" : "minmax(0, 1fr)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {hud}
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
          followPad={followPad}
          blobPx={landscape ? LANDSCAPE_BLOB_PX : undefined}
          labelScale={mobile ? (landscape ? 1.15 : 1.45) : 1}
        />
        {view.phase === "lobby" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              padding: landscape ? 10 : 24,
              zIndex: 6,
              minHeight: 0,
            }}
          >
            <div
              className="panel"
              style={{
                padding: landscape ? 12 : 22,
                textAlign: "center",
                minWidth: landscape ? 0 : 240,
                maxWidth: landscape ? 420 : undefined,
                width: landscape ? "min(420px, 72vw)" : undefined,
                maxHeight: "100%",
                overflow: "auto",
                minHeight: 0,
              }}
            >
              <div className="kicker">Lobby {code}</div>
              {me && (
                <>
                  <div style={{ display: "flex", justifyContent: "center", margin: landscape ? "6px 0 4px" : "12px 0 6px" }}>
                    <CritterThumb
                      avatar={me.avatar}
                      size={landscape ? 56 : 96}
                      tint={avatarTintIndex(view.players, me.id, me.avatar)}
                    />
                  </div>
                  <h2 style={{ fontSize: landscape ? 22 : 28, margin: 0 }}>{assignedCritterLine(me.avatar)}</h2>
                </>
              )}
              <p className="muted" style={{ margin: landscape ? "4px 0 0" : "8px 0 0" }}>
                Waiting for the admin to start
              </p>
              <p className="muted" style={{ margin: landscape ? "2px 0 0" : undefined }}>
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
              flexDirection: "column",
              alignItems: mobile ? "stretch" : "center",
              justifyContent: "center",
              padding: landscape ? 8 : mobile ? 10 : 24,
              zIndex: 9,
              background: "color-mix(in srgb, var(--page) 78%, transparent)",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <Leaderboard view={view} overlay compact={mobile} landscape={landscape} selfId={me?.id} />
          </div>
        )}
      </section>
      {dock}
      {!mobile && (
        <div className="muted" style={{ position: "absolute", bottom: 16, left: 16, zIndex: 6 }}>
          WASD / arrows to move · space to use {me?.powerId ? POWER_UPS[me.powerId as PowerId]?.label : "a power"}
        </div>
      )}
    </main>
  );
}
