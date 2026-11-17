"use client";

import {
  ARENA_H,
  ARENA_W,
  ART_INSET,
  clampToZoneArt,
  minZoneSize,
  PLAYER_RADIUS,
} from "@inkt/shared";
import { Critter } from "@/components/Critter";

const STATES = [
  { id: "idle", flags: {}, avatar: "bunny" },
  { id: "it", flags: { isIt: true }, avatar: "axolotl" },
  { id: "shield", flags: { hasShield: true }, avatar: "fox" },
  { id: "frozen", flags: { frozen: true }, avatar: "penguin" },
] as const;

const SIDES = ["n", "e", "s", "w"] as const;

function pinsFor(zone: { x: number; y: number; w: number; h: number }, onePerWall = false) {
  const pins = [];
  for (let s = 0; s < SIDES.length; s++) {
    const states = onePerWall ? [STATES[s]] : STATES;
    for (let k = 0; k < states.length; k++) {
      const side = SIDES[s];
      const state = states[k];
      const along = onePerWall ? 0.5 : (k + 1) / 5;
      let x = zone.x + zone.w / 2;
      let y = zone.y + zone.h / 2;
      if (side === "n") {
        x = zone.x + zone.w * along;
        y = zone.y;
      } else if (side === "s") {
        x = zone.x + zone.w * along;
        y = zone.y + zone.h;
      } else if (side === "w") {
        x = zone.x;
        y = zone.y + zone.h * along;
      } else {
        x = zone.x + zone.w;
        y = zone.y + zone.h * along;
      }
      const c = clampToZoneArt(x, y, zone);
      pins.push({ ...c, side, ...state, key: `${side}-${state.id}` });
    }
  }
  return pins;
}

function Board({
  zone,
  title,
  scale,
  onePerWall = false,
}: {
  zone: { x: number; y: number; w: number; h: number };
  title: string;
  scale: number;
  onePerWall?: boolean;
}) {
  const pins = pinsFor(zone, onePerWall);
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: "0 0 10px" }}>{title}</h2>
      <div style={{ width: zone.w * scale, height: zone.h * scale, position: "relative" }}>
        <div
          data-inkt="art-board"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: zone.w,
            height: zone.h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: "var(--paper)",
            border: "2px solid var(--zone)",
            borderRadius: 16,
            overflow: "visible",
          }}
        >
          <div data-inkt="zone" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
          {pins.map((pin) => (
            <div
              key={pin.key}
              data-inkt="player"
              data-player-id={pin.key}
              style={{
                position: "absolute",
                left: pin.x - zone.x - PLAYER_RADIUS,
                top: pin.y - zone.y - PLAYER_RADIUS,
                width: PLAYER_RADIUS * 2,
                height: PLAYER_RADIUS * 2,
              }}
            >
              <div
                data-inkt="art-clip"
                style={{
                  position: "absolute",
                  left: PLAYER_RADIUS - ART_INSET.left,
                  top: PLAYER_RADIUS - ART_INSET.top,
                  width: ART_INSET.left + ART_INSET.right,
                  height: ART_INSET.top + ART_INSET.bottom,
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: ART_INSET.left - PLAYER_RADIUS,
                    top: ART_INSET.top - PLAYER_RADIUS,
                    width: PLAYER_RADIUS * 2,
                    height: PLAYER_RADIUS * 2,
                  }}
                >
                  {pin.id === "shield" && <span className="shield-ring" />}
                  <Critter
                    avatar={pin.avatar}
                    radius={PLAYER_RADIUS}
                    tint={pin.id === "it" ? 1 : 0}
                    {...pin.flags}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ArtClampPage() {
  const full = { x: 0, y: 0, w: ARENA_W, h: ARENA_H };
  const min = minZoneSize(4);
  const minZone = { x: 0, y: 0, w: min.w, h: min.h };
  return (
    <main style={{ padding: 24, background: "var(--page)", minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: "0 0 8px" }}>Art clamp</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 20px" }}>
        Idle, IT, shield, and frozen pinned to every wall. Nothing should cross the orange zone.
      </p>
      <Board zone={full} title="Full arena" scale={0.72} />
      <Board zone={minZone} title="Final minimum zone (4 players)" scale={1} onePerWall />
    </main>
  );
}
