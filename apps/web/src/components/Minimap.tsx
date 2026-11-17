import { PLAYER_TOKEN } from "@inkt/shared";
import type { ViewState } from "@/game/types";

export function Minimap({
  view,
  selfId,
}: {
  view: ViewState;
  selfId?: string | null;
}) {
  const z = view.zone;
  const w = 108;
  const h = Math.max(48, (z.h / Math.max(1, z.w)) * w);
  const sx = (x: number) => ((x - z.x) / Math.max(1, z.w)) * w;
  const sy = (y: number) => ((y - z.y) / Math.max(1, z.h)) * h;
  const r = Math.max(2.2, (PLAYER_TOKEN / 2 / Math.max(z.w, z.h)) * w * 1.8);
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        right: 10,
        top: 10,
        zIndex: 7,
        background: "rgba(255,255,255,0.92)",
        border: "1.5px solid var(--ink)",
        borderRadius: 8,
        padding: 4,
        boxShadow: "var(--shadow)",
        pointerEvents: "none",
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <rect x="0.75" y="0.75" width={w - 1.5} height={h - 1.5} fill="#f7f9fb" stroke="#1d1d1d" strokeWidth="1.5" />
        {view.players.map((p) => (
          <circle
            key={p.id}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={p.id === selfId || p.isIt ? r + 1 : r}
            fill={p.isIt ? "#e03131" : p.id === selfId ? "#4ba1f1" : "#1d1d1d"}
            opacity={p.id === selfId || p.isIt ? 1 : 0.55}
          />
        ))}
      </svg>
    </div>
  );
}
