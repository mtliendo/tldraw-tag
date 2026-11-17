"use client";

const BITS = [
  { left: "8%", delay: "0s", color: "#f1ac4b", rotate: -12, kind: "star" },
  { left: "16%", delay: "0.12s", color: "#4ba1f1", rotate: 18, kind: "dot" },
  { left: "24%", delay: "0.05s", color: "#e03131", rotate: -8, kind: "squiggle" },
  { left: "33%", delay: "0.22s", color: "#4cb05e", rotate: 24, kind: "star" },
  { left: "42%", delay: "0.08s", color: "#ae3ec9", rotate: -20, kind: "dot" },
  { left: "51%", delay: "0.18s", color: "#e16919", rotate: 10, kind: "note" },
  { left: "60%", delay: "0.03s", color: "#4465e9", rotate: -16, kind: "star" },
  { left: "69%", delay: "0.27s", color: "#f87777", rotate: 8, kind: "squiggle" },
  { left: "78%", delay: "0.14s", color: "#099268", rotate: -4, kind: "dot" },
  { left: "86%", delay: "0.2s", color: "#FCE19C", rotate: 14, kind: "note" },
  { left: "12%", delay: "0.34s", color: "#8AA3FF", rotate: -22, kind: "star" },
  { left: "47%", delay: "0.4s", color: "#DB91FD", rotate: 6, kind: "dot" },
  { left: "73%", delay: "0.31s", color: "#FAA475", rotate: -10, kind: "squiggle" },
  { left: "91%", delay: "0.09s", color: "#4cb05e", rotate: 20, kind: "note" },
];

function Bit({ kind, color }: { kind: string; color: string }) {
  if (kind === "star") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24">
        <path fill={color} stroke="#1d1d1d" strokeWidth="1.4" d="M12 2l2.2 6.4H21l-5.4 4 2 6.6L12 15.6 6.4 19l2-6.6L3 8.4h6.8z" />
      </svg>
    );
  }
  if (kind === "squiggle") {
    return (
      <svg width="28" height="16" viewBox="0 0 28 16">
        <path d="M2 10c4-8 8 8 12 0s8 8 12 0" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
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
      <circle cx="7" cy="7" r="5.5" fill={color} stroke="#1d1d1d" strokeWidth="1.4" />
    </svg>
  );
}

export function Confetti() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 8,
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
            transform: `rotate(${bit.rotate}deg)`,
          }}
        >
          <Bit kind={bit.kind} color={bit.color} />
        </span>
      ))}
    </div>
  );
}
