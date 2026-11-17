"use client";

import type { CSSProperties } from "react";
import { CritterThumb } from "@/components/Critter";
import { STICK_KNOB, STICK_SIZE } from "@/game/playGestures";

export function Joystick({
  origin,
  knob,
  fading = false,
  avatar,
  tint = 0,
}: {
  origin: { x: number; y: number };
  knob: { x: number; y: number };
  fading?: boolean;
  avatar?: string;
  tint?: number;
}) {
  const base: CSSProperties = {
    position: "absolute",
    left: origin.x,
    top: origin.y,
    width: STICK_SIZE,
    height: STICK_SIZE,
    margin: `${-STICK_SIZE / 2}px 0 0 ${-STICK_SIZE / 2}px`,
    borderRadius: "50%",
    border: "1.5px solid var(--line)",
    pointerEvents: "none",
    zIndex: 5,
    opacity: fading ? 0 : 1,
    transition: "opacity 160ms ease",
  };
  return (
    <div data-inkt="joy" className="joy-overlay" style={base} aria-label="Move" aria-hidden={fading}>
      <div
        data-inkt="joy-knob"
        style={{
          width: STICK_KNOB,
          height: STICK_KNOB,
          borderRadius: "50%",
          background: "#fff",
          border: "1.5px solid var(--line)",
          position: "absolute",
          left: "50%",
          top: "50%",
          margin: `${-STICK_KNOB / 2}px 0 0 ${-STICK_KNOB / 2}px`,
          transform: `translate(${knob.x}px, ${knob.y}px)`,
          boxShadow: "0 3px 0 rgba(29,29,31,.15)",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        {avatar ? <CritterThumb avatar={avatar} size={STICK_KNOB - 4} tint={tint} /> : null}
      </div>
    </div>
  );
}
