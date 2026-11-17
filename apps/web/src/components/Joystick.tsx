"use client";

import { useRef } from "react";

export function Joystick({
  onChange,
  compact = false,
}: {
  onChange: (x: number, y: number) => void;
  compact?: boolean;
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
      style={{
        width: compact ? 118 : 156,
        height: compact ? 118 : 156,
        borderRadius: "48% 52% 46% 54%",
        background: "#FCE19C",
        border: "1.5px solid var(--ink)",
        position: "relative",
        touchAction: "none",
        boxShadow: "var(--shadow)",
      }}
      aria-label="Move"
    >
      <div
        ref={knob}
        style={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          borderRadius: "46% 54% 50% 50%",
          background: "#4ba1f1",
          border: "1.5px solid var(--ink)",
          position: "absolute",
          left: "50%",
          top: "50%",
          margin: compact ? "-24px 0 0 -24px" : "-32px 0 0 -32px",
          boxShadow: "var(--shadow)",
        }}
      />
      <div
        className="kicker"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: compact ? 8 : -22,
          textAlign: "center",
          color: "var(--ink)",
        }}
      >
        move
      </div>
    </div>
  );
}
