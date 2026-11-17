"use client";

import { formatTime } from "@inkt/shared";
import { avatarById } from "@inkt/shared";
import type { ViewState } from "@/game/types";

export function Leaderboard({
  view,
  overlay = false,
  compact = false,
}: {
  view: ViewState;
  overlay?: boolean;
  compact?: boolean;
}) {
  if (view.phase !== "ended" && !overlay) return null;
  const rows = view.leaderboard;
  const cols = compact ? (rows.length >= 8 ? 2 : 1) : rows.length >= 12 ? 2 : 1;
  return (
    <div
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: compact ? "0 1 auto" : undefined,
        alignSelf: compact ? "center" : undefined,
        padding: compact ? 12 : cols === 2 ? 18 : 24,
        minWidth: compact ? 0 : cols === 2 ? 520 : 280,
        maxWidth: compact ? 420 : cols === 2 ? 760 : 440,
        width: compact ? "100%" : cols === 2 ? "min(760px, 92vw)" : undefined,
        maxHeight: compact ? "min(46dvh, 280px)" : "72vh",
        minHeight: 0,
        overflow: "auto",
        background: overlay ? "#fff" : undefined,
        transform: compact ? undefined : "rotate(-0.6deg)",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: compact ? -12 : -18,
          margin: compact ? "-12px -12px 8px" : "-18px -18px 10px",
          padding: compact ? "12px 12px 8px" : "18px 18px 8px",
          background: overlay ? "#fff" : "var(--card)",
          zIndex: 1,
        }}
      >
        <div className="kicker">end of round</div>
        <h2 style={{ fontSize: compact ? 22 : cols === 2 ? 28 : 36, margin: "4px 0 0" }}>
          {view.itName ? `${view.itName} was IT` : "Round over"}
        </h2>
      </div>
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
          columnGap: compact ? 10 : 18,
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
                gap: compact ? 6 : 8,
                padding: compact ? "4px 0" : cols === 2 ? "5px 0" : "8px 0",
                borderTop: "2px solid var(--ink)",
                color: row.isIt ? "var(--it)" : "inherit",
                minWidth: 0,
                fontSize: compact ? 13 : undefined,
              }}
            >
              <span style={{ width: compact ? 16 : 22, opacity: 0.7, flexShrink: 0 }}>{i + 1}</span>
              <span
                style={{
                  width: compact ? 12 : 16,
                  height: compact ? 12 : 16,
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
