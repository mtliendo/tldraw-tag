"use client";

import { useRef } from "react";

export function Joystick({
  onChange,
}: {
  onChange: (x: number, y: number) => void;
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
        width: 148,
        height: 148,
        borderRadius: "50%",
        background: "rgba(10,12,22,0.72)",
        border: "2px solid rgba(255,255,255,0.16)",
        position: "relative",
        touchAction: "none",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.5)",
      }}
    >
      <div
        ref={knob}
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#f4f7ff",
          position: "absolute",
          left: "50%",
          top: "50%",
          margin: "-32px 0 0 -32px",
          boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );
}
