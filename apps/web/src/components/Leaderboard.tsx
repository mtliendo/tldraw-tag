"use client";

import { formatTime } from "@inkt/shared";
import { avatarById } from "@inkt/shared";
import type { ViewState } from "@/game/types";

export function Leaderboard({
  view,
  overlay = false,
}: {
  view: ViewState;
  overlay?: boolean;
}) {
  if (view.phase !== "ended" && !overlay) return null;
  return (
    <div
      className="panel"
      style={{
        padding: 24,
        minWidth: 280,
        maxWidth: 420,
        background: overlay ? "rgba(7,8,15,0.92)" : undefined,
      }}
    >
      <div className="kicker">End of round</div>
      <h2 style={{ fontSize: 36, margin: "4px 0 12px" }}>
        {view.itName ? `${view.itName} was IT` : "Round over"}
      </h2>
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {view.leaderboard.map((row, i) => {
          const avatar = avatarById(row.avatar);
          return (
            <li
              key={row.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                color: row.isIt ? "var(--it)" : "inherit",
              }}
            >
              <span style={{ width: 28, fontFamily: "var(--font-mono)", opacity: 0.7 }}>{i + 1}</span>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 99,
                  background: avatar.color,
                }}
              />
              <strong style={{ flex: 1 }}>
                {row.name}
                {row.isIt ? "  ·  IT" : ""}
              </strong>
              <span style={{ fontFamily: "var(--font-mono)" }}>{formatTime(row.score)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
