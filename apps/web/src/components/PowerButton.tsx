"use client";

import { POWER_UPS, type PowerId } from "@inkt/shared";
import { PowerGlyph } from "@/components/PowerGlyph";

export function PowerButton({
  powerId,
  charges,
  onUse,
  compact = false,
  overlay = false,
}: {
  powerId: string;
  charges: number;
  onUse: () => void;
  compact?: boolean;
  overlay?: boolean;
}) {
  const def = POWER_UPS[powerId as PowerId];
  const ready = Boolean(def) && charges > 0;
  const size = overlay ? 100 : compact ? 120 : 132;
  return (
    <button
      type="button"
      className={overlay ? "power-overlay" : undefined}
      onPointerDown={(e) => {
        e.preventDefault();
        if (ready) onUse();
      }}
      disabled={!ready}
      style={{
        width: size,
        height: size,
        borderRadius: overlay ? 24 : 28,
        border: "1.5px solid var(--line)",
        background: overlay ? undefined : "#fff",
        color: "var(--ink)",
        fontWeight: 700,
        fontSize: overlay ? 13 : compact ? 15 : 18,
        boxShadow: ready ? "0 3px 0 #1D1D1F" : "none",
        touchAction: "manipulation",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: overlay ? 4 : 6,
        opacity: ready ? 1 : 0.45,
      }}
    >
      {ready ? (
        <>
          <span
            style={{
              width: overlay ? 40 : 46,
              height: overlay ? 40 : 46,
              borderRadius: 14,
              background: def.color,
              display: "grid",
              placeItems: "center",
              border: "1.5px solid var(--line)",
            }}
          >
            <PowerGlyph icon={def.icon} color={def.ink} size={overlay ? 22 : compact ? 26 : 28} />
          </span>
          <span>{def.label}</span>
          {!overlay && (
            <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
              tap to {def.verb}
            </span>
          )}
        </>
      ) : (
        "power"
      )}
    </button>
  );
}
