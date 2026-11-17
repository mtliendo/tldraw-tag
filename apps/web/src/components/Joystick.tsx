"use client";

import { useRef } from "react";
import { CritterThumb } from "@/components/Critter";

export function Joystick({
  onChange,
  compact = false,
  overlay = false,
  avatar,
  tint = 0,
}: {
  onChange: (x: number, y: number) => void;
  compact?: boolean;
  overlay?: boolean;
  avatar?: string;
  tint?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  const setFromEvent = (clientX: number, clientY: number) => {
    const el = root.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const max = rect.width / 2 - 18;
    const mag = Math.hypot(dx, dy);
    const clamped = mag > max ? max / mag : 1;
    const x = (dx * clamped) / max;
    const y = (dy * clamped) / max;
    if (knob.current) {
      knob.current.style.transform = `translate(${dx * clamped}px, ${dy * clamped}px)`;
    }
    onChange(x, y);
  };

  const end = () => {
    active.current = false;
    if (knob.current) knob.current.style.transform = "translate(0,0)";
    onChange(0, 0);
  };

  const size = overlay ? 108 : compact ? 126 : 156;
  const knobSize = overlay ? 46 : compact ? 52 : 64;

  return (
    <div
      ref={root}
      onPointerDown={(e) => {
        active.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setFromEvent(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!active.current) return;
        setFromEvent(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      className={overlay ? "joy-overlay" : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: overlay ? undefined : "#F1F0EC",
        border: "1.5px solid var(--line)",
        position: "relative",
        touchAction: "none",
      }}
      aria-label="Move"
    >
      <div
        ref={knob}
        style={{
          width: knobSize,
          height: knobSize,
          borderRadius: "50%",
          background: "#fff",
          border: "1.5px solid var(--line)",
          position: "absolute",
          left: "50%",
          top: "50%",
          margin: `${-knobSize / 2}px 0 0 ${-knobSize / 2}px`,
          boxShadow: "0 3px 0 rgba(29,29,31,.15)",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        {avatar ? <CritterThumb avatar={avatar} size={knobSize - 4} tint={tint} /> : null}
      </div>
      <div
        className="kicker"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: overlay ? 6 : -20,
          textAlign: "center",
          color: "var(--muted)",
          display: overlay ? "none" : undefined,
        }}
      >
        move
      </div>
    </div>
  );
}
