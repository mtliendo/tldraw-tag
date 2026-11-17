"use client";

import { POWER_UPS, type PowerId } from "@inkt/shared";
import { PowerGlyph } from "@/components/PowerGlyph";

export function PowerButton({
  powerId,
  charges,
  onUse,
}: {
  powerId: string;
  charges: number;
  onUse: () => void;
}) {
  const def = POWER_UPS[powerId as PowerId];
  const ready = Boolean(def) && charges > 0;
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        if (ready) onUse();
      }}
      disabled={!ready}
      style={{
        width: 132,
        height: 132,
        borderRadius: 8,
        border: "3px solid var(--ink)",
        background: ready ? def.color : "#C0CAD3",
        color: "var(--ink)",
        fontWeight: 800,
        letterSpacing: 0.4,
        fontSize: 18,
        boxShadow: "3px 3px 0 var(--ink)",
        touchAction: "manipulation",
        transform: "rotate(3deg)",
      }}
    >
      {ready ? (
        <span style={{ display: "grid", placeItems: "center", gap: 4 }}>
          <PowerGlyph icon={def.icon} color={def.ink} size={36} />
          {def.verb}
          <small>
            {charges} left
          </small>
        </span>
      ) : (
        "power"
      )}
    </button>
  );
}
