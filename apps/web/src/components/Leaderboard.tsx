"use client";

import { avatarTintIndex, formatTime } from "@inkt/shared";
import type { ViewState } from "@/game/types";
import { CritterThumb } from "@/components/Critter";
import { shortPlayerName } from "@/game/layoutPlayers";

export function Leaderboard({
  view,
  overlay = false,
  compact = false,
  landscape = false,
  selfId,
}: {
  view: ViewState;
  overlay?: boolean;
  compact?: boolean;
  landscape?: boolean;
  selfId?: string | null;
}) {
  if (view.phase !== "ended" && !overlay) return null;
  const rows = view.leaderboard;
  const cols = compact && !landscape ? 1 : rows.length >= 8 ? 2 : 1;
  const winner = rows[0];
  const selfIndex = selfId ? rows.findIndex((row) => row.id === selfId) : -1;
  const selfRow = selfIndex >= 0 ? rows[selfIndex] : null;
  const nameMax = compact ? 12 : 16;

  return (
    <div
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: compact ? "1 1 auto" : undefined,
        alignSelf: compact ? "stretch" : undefined,
        padding: landscape ? 10 : compact ? 12 : 22,
        minWidth: compact ? 0 : cols === 2 ? 640 : 320,
        maxWidth: compact ? "100%" : cols === 2 ? 1040 : 520,
        width: compact ? "100%" : cols === 2 ? "min(1040px, 92vw)" : undefined,
        maxHeight: compact ? "100%" : "78vh",
        minHeight: 0,
        overflow: "hidden",
        background: overlay ? "#fff" : undefined,
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          paddingBottom: compact ? 8 : 10,
          background: "#fff",
        }}
      >
        <div className="kicker">round over · {rows.length} players</div>
        <h2 style={{ fontSize: landscape ? 18 : compact ? 22 : 40, margin: landscape ? "2px 0 0" : "6px 0 0" }}>
          {winner ? `${shortPlayerName(winner.name, nameMax)} wins!` : view.itName ? `${view.itName} was IT` : "Round over"}
        </h2>
        <p className="muted" style={{ margin: landscape ? "2px 0 0" : "6px 0 0", fontSize: compact ? 12 : 14 }}>
          Time as IT · lowest wins
        </p>
      </div>
      {compact && selfRow && (
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 0",
            marginBottom: 4,
            borderBottom: "1.5px solid var(--line)",
            fontWeight: 600,
            fontSize: 14,
            minWidth: 0,
          }}
        >
          <CritterThumb
            avatar={selfRow.avatar}
            size={28}
            tint={avatarTintIndex(rows, selfRow.id, selfRow.avatar)}
            isIt={selfRow.isIt}
          />
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            You: #{selfIndex + 1} · {formatTime(selfRow.score)}
          </span>
        </div>
      )}
      {!compact && (
        <div
          className="muted"
          style={{
            display: "grid",
            gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
            columnGap: 36,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "4px 0 2px",
            flex: "0 0 auto",
          }}
        >
          {Array.from({ length: cols }, (_, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 40px 1fr 64px", gap: 8 }}>
              <span />
              <span />
              <span>Player</span>
              <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>IT time</span>
            </div>
          ))}
        </div>
      )}
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
          columnGap: compact ? 12 : 36,
          rowGap: 0,
          overflow: "auto",
          flex: "1 1 auto",
          minHeight: 0,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {rows.map((row, i) => {
          const tint = avatarTintIndex(rows, row.id, row.avatar);
          return (
            <li
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns: compact ? "28px 28px 1fr 48px" : "28px 40px 1fr 64px",
                alignItems: "center",
                gap: compact ? 6 : 8,
                height: landscape ? 34 : compact ? 40 : 52,
                borderBottom: "1px solid var(--hair)",
                color: row.isIt ? "var(--it)" : "inherit",
                minWidth: 0,
                fontSize: landscape ? 13 : compact ? 14 : 17,
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
                {shortPlayerName(row.name, nameMax)}
                {row.isIt ? " · IT" : ""}
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
