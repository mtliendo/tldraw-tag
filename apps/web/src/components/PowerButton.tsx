"use client";

import { POWER_UPS, type PowerId } from "@inkt/shared";
import { PowerGlyph } from "@/components/PowerGlyph";

export function PowerButton({
  powerId,
  charges,
  onUse,
  compact = false,
}: {
  powerId: string;
  charges: number;
  onUse: () => void;
  compact?: boolean;
}) {
  const def = POWER_UPS[powerId as PowerId];
  const ready = Boolean(def) && charges > 0;
  const size = compact ? 120 : 132;
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        if (ready) onUse();
      }}
      disabled={!ready}
      style={{
        width: size,
        height: size,
        borderRadius: 28,
        border: "1.5px solid var(--line)",
        background: "#fff",
        color: "var(--ink)",
        fontWeight: 700,
        fontSize: compact ? 15 : 18,
        boxShadow: ready ? "0 3px 0 #1D1D1F" : "none",
        touchAction: "manipulation",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: ready ? 1 : 0.45,
      }}
    >
      {ready ? (
        <>
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: def.color,
              display: "grid",
              placeItems: "center",
              border: "1.5px solid var(--line)",
            }}
          >
            <PowerGlyph icon={def.icon} color={def.ink} size={compact ? 26 : 28} />
          </span>
          <span>{def.label}</span>
          <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
            tap to {def.verb}
          </span>
        </>
      ) : (
        "power"
      )}
    </button>
  );
}
