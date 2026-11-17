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
  const rows = view.leaderboard;
  const cols = rows.length >= 12 ? 2 : 1;
  return (
    <div
      className="panel"
      style={{
        padding: cols === 2 ? 18 : 24,
        minWidth: cols === 2 ? 520 : 280,
        maxWidth: cols === 2 ? 760 : 440,
        width: cols === 2 ? "min(760px, 92vw)" : undefined,
        maxHeight: "72vh",
        overflow: "auto",
        background: overlay ? "#fff" : undefined,
        transform: "rotate(-0.6deg)",
      }}
    >
      <div className="kicker">end of round</div>
      <h2 style={{ fontSize: cols === 2 ? 28 : 36, margin: "4px 0 10px" }}>
        {view.itName ? `${view.itName} was IT` : "Round over"}
      </h2>
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
          columnGap: 18,
          rowGap: 0,
        }}
      >
        {rows.map((row, i) => {
          const avatar = avatarById(row.avatar);
          return (
            <li
              key={row.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: cols === 2 ? "5px 0" : "8px 0",
                borderTop: "2px solid var(--ink)",
                color: row.isIt ? "var(--it)" : "inherit",
                minWidth: 0,
              }}
            >
              <span style={{ width: 22, opacity: 0.7, flexShrink: 0 }}>{i + 1}</span>
              <span
                style={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  borderRadius: "46% 54% 50% 50%",
                  background: avatar.color,
                  border: "1.5px solid var(--ink)",
                }}
              />
              <strong
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.name}
                {row.isIt ? "  ·  IT" : ""}
              </strong>
              <span style={{ flexShrink: 0 }}>{formatTime(row.score)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
