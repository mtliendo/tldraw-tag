import { PLAYER_LABEL_H, PLAYER_TOKEN } from "@inkt/shared";
import type { ViewPlayer } from "./types";

export type LaidOutPlayer = ViewPlayer & {
  labelX: number;
  labelAbove: boolean;
  labelStack: number;
  labelW: number;
  showLabel: boolean;
};

type Zone = { x: number; y: number; w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number };

function labelWidth(name: string, scale: number) {
  return Math.min(120 * scale, Math.max(36 * scale, (18 + name.length * 8.2) * scale));
}

function overlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function layoutPlayers(
  players: ViewPlayer[],
  zone: Zone,
  labelScale = 1,
  selfId?: string | null,
): LaidOutPlayer[] {
  const r = PLAYER_TOKEN / 2;
  const lh = PLAYER_LABEL_H * labelScale + 4;
  const laid: LaidOutPlayer[] = players.map((p) => {
    const nearBottom = p.y + r + lh + 8 > zone.y + zone.h;
    const nearTop = p.y - r - lh - 8 < zone.y;
    return {
      ...p,
      labelX: 0,
      labelAbove: nearBottom && !nearTop,
      labelStack: 0,
      labelW: labelWidth(p.name, labelScale),
      showLabel: true,
    };
  });

  const labelRect = (p: LaidOutPlayer): Rect => ({
    x: p.x - p.labelW / 2 + p.labelX - 4,
    y: p.labelAbove ? p.y - r - 8 - lh : p.y + r + 2,
    w: p.labelW + 12,
    h: lh + 6,
  });

  const blobRect = (p: LaidOutPlayer): Rect => ({
    x: p.x - r - 4,
    y: p.y - r - 4,
    w: r * 2 + 8,
    h: r * 2 + 8,
  });

  const rank = (p: LaidOutPlayer) => {
    if (p.isIt) return 0;
    if (p.id === selfId) return 1;
    if (p.frozen) return 2;
    return 3;
  };

  const hitsTaken = (p: LaidOutPlayer, taken: LaidOutPlayer[]) =>
    taken.some(
      (q) => overlap(labelRect(p), labelRect(q)) || overlap(labelRect(p), blobRect(q)),
    );

  const ranked = [...laid].sort((a, b) => rank(a) - rank(b) || a.y - b.y || a.x - b.x);
  const taken: LaidOutPlayer[] = [];
  const nudges = [0, 28 * labelScale, -28 * labelScale, 48 * labelScale, -48 * labelScale];

  for (const p of ranked) {
    const preferAbove = p.labelAbove;
    let placed = false;
    for (const above of preferAbove ? [true, false] : [false, true]) {
      if (above && p.y - r - lh - 8 < zone.y) continue;
      if (!above && p.y + r + lh + 8 > zone.y + zone.h) continue;
      p.labelAbove = above;
      for (const nx of nudges) {
        p.labelX = nx;
        if (!hitsTaken(p, taken)) {
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed && rank(p) <= 1) {
      p.labelX = 0;
      p.labelAbove = preferAbove;
      placed = true;
    }
    if (!placed) p.showLabel = false;
    else taken.push(p);
  }

  return laid;
}
