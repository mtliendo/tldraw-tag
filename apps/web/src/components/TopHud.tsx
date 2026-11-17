"use client";

import { formatTime, POWER_UPS, type PowerId } from "@inkt/shared";
import type { ViewState } from "@/game/types";

export function TopHud({
  view,
  selfPower,
}: {
  view: ViewState;
  selfPower?: { id: string; charges: number };
}) {
  const def = selfPower?.id ? POWER_UPS[selfPower.id as PowerId] : null;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div className="chip" style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>
        {view.phase === "ended" ? "FINAL" : formatTime(view.timeLeft)}
      </div>
      <div className="chip" style={{ background: view.itName ? "rgba(255,45,123,0.18)" : undefined }}>
        <span className="kicker" style={{ margin: 0 }}>
          IT
        </span>
        <strong>{view.itName || "—"}</strong>
      </div>
      <div className="chip">{view.phase.toUpperCase()}</div>
      {def && (
        <div className="chip" style={{ background: def.color, color: def.ink }}>
          {def.label} · {selfPower?.charges}
        </div>
      )}
    </div>
  );
}
