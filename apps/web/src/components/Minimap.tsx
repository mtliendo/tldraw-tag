import { PLAYER_TOKEN, avatarById } from "@inkt/shared";
import type { ViewState } from "@/game/types";

export function Minimap({
  view,
  selfId,
  compact = false,
}: {
  view: ViewState;
  selfId?: string | null;
  compact?: boolean;
}) {
  const z = view.zone;
  const w = compact ? 64 : 88;
  const h = Math.max(compact ? 36 : 44, (z.h / Math.max(1, z.w)) * w);
  const sx = (x: number) => ((x - z.x) / Math.max(1, z.w)) * w;
  const sy = (y: number) => ((y - z.y) / Math.max(1, z.h)) * h;
  const r = Math.max(1.8, (PLAYER_TOKEN / 2 / Math.max(z.w, z.h)) * w * 1.6);
  return (
    <div
      aria-hidden
      style={{
        position: compact ? "relative" : "absolute",
        right: compact ? undefined : 10,
        top: compact ? undefined : 10,
        zIndex: 7,
        background: "rgba(255,255,255,0.92)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        padding: compact ? 3 : 4,
        pointerEvents: "none",
        flexShrink: 0,
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <rect
          x="0.75"
          y="0.75"
          width={w - 1.5}
          height={h - 1.5}
          fill="rgba(247,249,251,0.35)"
          stroke="#1d1d1d"
          strokeWidth="1.5"
        />
        {view.players.map((p) => (
          <circle
            key={p.id}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={p.id === selfId || p.isIt ? r + 1 : r}
            fill={p.isIt ? "#E8542F" : p.id === selfId ? "#4465E9" : avatarById(p.avatar).color}
            opacity={p.id === selfId || p.isIt ? 1 : 0.5}
          />
        ))}
      </svg>
    </div>
  );
}
