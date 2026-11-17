"use client";

import { POWER_UPS, type PowerId } from "@inkt/shared";

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
        borderRadius: "50%",
        border: 0,
        background: ready ? def.color : "#1a1d2b",
        color: ready ? def.ink : "#6b7388",
        fontWeight: 900,
        letterSpacing: 0.6,
        fontSize: 16,
        boxShadow: ready ? `0 0 28px ${def.color}` : "none",
        touchAction: "manipulation",
      }}
    >
      {ready ? (
        <span>
          {def.verb}
          <br />
          <small>
            {charges} left
          </small>
        </span>
      ) : (
        "POWER"
      )}
    </button>
  );
}
