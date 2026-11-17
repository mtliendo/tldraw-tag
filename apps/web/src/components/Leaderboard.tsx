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
        background: overlay ? "#fff" : undefined,
        transform: "rotate(-1deg)",
      }}
    >
      <div className="kicker">end of round</div>
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
                borderTop: "2px solid var(--ink)",
                color: row.isIt ? "var(--it)" : "inherit",
              }}
            >
              <span style={{ width: 28, opacity: 0.7 }}>{i + 1}</span>
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "46% 54% 50% 50%",
                  background: avatar.color,
                  border: "2px solid var(--ink)",
                }}
              />
              <strong style={{ flex: 1 }}>
                {row.name}
                {row.isIt ? "  ·  IT" : ""}
              </strong>
              <span>{formatTime(row.score)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
