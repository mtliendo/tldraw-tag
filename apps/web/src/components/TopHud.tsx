"use client";

import { avatarTintIndex, formatTime, phaseStatus, POWER_UPS, type PowerId } from "@inkt/shared";
import type { ViewState } from "@/game/types";
import { CritterThumb } from "@/components/Critter";

export function TopHud({
  view,
  selfPower,
  slim = false,
}: {
  view: ViewState;
  selfPower?: { id: string; charges: number };
  slim?: boolean;
}) {
  const def = selfPower?.id ? POWER_UPS[selfPower.id as PowerId] : null;
  const it = view.players.find((p) => p.isIt);
  return (
    <div
      style={{
        display: "flex",
        gap: slim ? 6 : 8,
        alignItems: "center",
        flexWrap: slim ? "nowrap" : "wrap",
        minWidth: 0,
      }}
    >
      <div
        className="chip"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: slim ? 18 : 21,
          fontWeight: 700,
          padding: slim ? "4px 10px" : undefined,
          flexShrink: 0,
        }}
      >
        {view.phase === "ended" ? "final" : formatTime(view.timeLeft)}
      </div>
      {view.phase !== "ended" && (
        <div className="chip it-chip" style={{ padding: slim ? "3px 8px 3px 4px" : undefined, minWidth: 0 }}>
          {it && (
            <CritterThumb
              avatar={it.avatar}
              size={slim ? 22 : 28}
              isIt
              tint={avatarTintIndex(view.players, it.id, it.avatar)}
            />
          )}
          <span style={{ minWidth: 0 }}>
            {!slim && (
              <span className="kicker" style={{ color: "var(--it)", margin: 0, display: "block" }}>
                it
              </span>
            )}
            <strong
              style={{
                fontSize: slim ? 13 : 15,
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: slim ? 88 : undefined,
              }}
            >
              {slim ? `IT ${view.itName || "—"}` : view.itName || "—"}
            </strong>
          </span>
        </div>
      )}
      {!slim && <div className="chip">{phaseStatus(view)}</div>}
      {def && (
        <div
          className="chip"
          style={{
            background: def.color,
            color: def.ink,
            borderColor: "var(--line)",
            padding: slim ? "4px 8px" : undefined,
            flexShrink: 0,
            fontSize: slim ? 12 : undefined,
          }}
        >
          {def.label} · {selfPower?.charges}
        </div>
      )}
    </div>
  );
}
