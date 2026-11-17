"use client";

import { avatarTintIndex, formatTime, phaseStatus, POWER_UPS, type PowerId } from "@inkt/shared";
import type { ViewState } from "@/game/types";
import { CritterThumb } from "@/components/Critter";

export function TopHud({
  view,
  selfPower,
}: {
  view: ViewState;
  selfPower?: { id: string; charges: number };
}) {
  const def = selfPower?.id ? POWER_UPS[selfPower.id as PowerId] : null;
  const it = view.players.find((p) => p.isIt);
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div className="chip" style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700 }}>
        {view.phase === "ended" ? "final" : formatTime(view.timeLeft)}
      </div>
      {view.phase !== "ended" && (
        <div className="chip it-chip">
          {it && (
            <CritterThumb
              avatar={it.avatar}
              size={28}
              isIt
              tint={avatarTintIndex(view.players, it.id, it.avatar)}
            />
          )}
          <span>
            <span className="kicker" style={{ color: "var(--it)", margin: 0, display: "block" }}>
              it
            </span>
            <strong style={{ fontSize: 15 }}>{view.itName || "—"}</strong>
          </span>
        </div>
      )}
      <div className="chip">{phaseStatus(view)}</div>
      {def && (
        <div className="chip" style={{ background: def.color, color: def.ink, borderColor: "var(--line)" }}>
          {def.label} · {selfPower?.charges}
        </div>
      )}
    </div>
  );
}
