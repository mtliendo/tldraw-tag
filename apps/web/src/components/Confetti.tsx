"use client";

import { useEffect, useState } from "react";

const BITS = [
  { left: "8%", delay: "0s", color: "#F4B63F", rotate: -12, kind: "star" },
  { left: "18%", delay: "0.12s", color: "#4465E9", rotate: 18, kind: "dot" },
  { left: "28%", delay: "0.05s", color: "#E8542F", rotate: -8, kind: "squiggle" },
  { left: "40%", delay: "0.22s", color: "#1E9E6A", rotate: 24, kind: "star" },
  { left: "52%", delay: "0.08s", color: "#F28A3C", rotate: -20, kind: "dot" },
  { left: "64%", delay: "0.18s", color: "#A78BFA", rotate: 10, kind: "note" },
  { left: "76%", delay: "0.03s", color: "#F4B63F", rotate: -16, kind: "star" },
  { left: "88%", delay: "0.27s", color: "#4465E9", rotate: 8, kind: "squiggle" },
];

function Bit({ kind, color }: { kind: string; color: string }) {
  if (kind === "star") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24">
        <path fill={color} stroke="#1d1d1d" strokeWidth="1.5" d="M12 2l2.2 6.4H21l-5.4 4 2 6.6L12 15.6 6.4 19l2-6.6L3 8.4h6.8z" />
      </svg>
    );
  }
  if (kind === "squiggle") {
    return (
      <svg width="28" height="16" viewBox="0 0 28 16">
        <path d="M2 10c4-8 8 8 12 0s8 8 12 0" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "note") {
    return (
      <svg width="18" height="22" viewBox="0 0 18 22">
        <rect x="1" y="2" width="16" height="18" fill={color} stroke="#1d1d1d" strokeWidth="1.5" transform="rotate(-8 9 11)" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5.5" fill={color} stroke="#1d1d1d" strokeWidth="1.5" />
    </svg>
  );
}

export function Confetti() {
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setAlive(false), 2100);
    return () => window.clearTimeout(t);
  }, []);
  if (!alive) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 6,
      }}
    >
      {BITS.map((bit, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={{
            left: bit.left,
            top: "-8%",
            animationDelay: bit.delay,
            ["--spin" as string]: `${bit.rotate}deg`,
          }}
        >
          <Bit kind={bit.kind} color={bit.color} />
        </span>
      ))}
    </div>
  );
}
