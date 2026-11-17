"use client";

import { avatarTintIndex, formatTime } from "@inkt/shared";
import type { ViewState } from "@/game/types";
import { CritterThumb } from "@/components/Critter";

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
  const cols = compact ? (rows.length >= 8 ? 2 : 1) : rows.length >= 8 ? 2 : 1;
  const winner = rows[0];
  return (
    <div
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: compact ? "0 1 auto" : undefined,
        alignSelf: compact ? "center" : undefined,
        padding: compact ? 12 : 22,
        minWidth: compact ? 0 : cols === 2 ? 640 : 320,
        maxWidth: compact ? 420 : cols === 2 ? 1040 : 520,
        width: compact ? "100%" : cols === 2 ? "min(1040px, 92vw)" : undefined,
        maxHeight: compact ? "min(46dvh, 280px)" : "78vh",
        minHeight: 0,
        overflow: "auto",
        background: overlay ? "#fff" : undefined,
      }}
    >
      <div
        style={{
          position: "sticky",
          top: compact ? -12 : -22,
          margin: compact ? "-12px -12px 8px" : "-22px -22px 12px",
          padding: compact ? "12px 12px 8px" : "22px 22px 10px",
          background: "#fff",
          zIndex: 1,
        }}
      >
        <div className="kicker">round over · {rows.length} players</div>
        <h2 style={{ fontSize: compact ? 22 : 40, margin: "6px 0 0" }}>
          {winner ? `${winner.name} wins!` : view.itName ? `${view.itName} was IT` : "Round over"}
        </h2>
        {!compact && (
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Least time spent as IT.
          </p>
        )}
      </div>
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
          columnGap: compact ? 12 : 36,
          rowGap: 0,
        }}
      >
        {rows.map((row, i) => {
          const tint = avatarTintIndex(rows, row.id, row.avatar);
          return (
            <li
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns: compact ? "22px 28px 1fr 44px" : "28px 40px 1fr 56px",
                alignItems: "center",
                gap: compact ? 6 : 8,
                height: compact ? 36 : 52,
                borderBottom: "1px solid var(--hair)",
                color: row.isIt ? "var(--it)" : "inherit",
                minWidth: 0,
                fontSize: compact ? 13 : 17,
                fontWeight: 600,
              }}
            >
              <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
              <CritterThumb avatar={row.avatar} size={compact ? 28 : 36} tint={tint} isIt={row.isIt} />
              <strong
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                {row.name}
                {row.isIt ? "  ·  IT" : ""}
              </strong>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: row.isIt ? "var(--it)" : "var(--muted)" }}>
                {formatTime(row.score)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
