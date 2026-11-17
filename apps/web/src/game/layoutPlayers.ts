import { PLAYER_LABEL_H, PLAYER_LABEL_W, PLAYER_TOKEN } from "@inkt/shared";
import type { ViewPlayer } from "./types";

export type LaidOutPlayer = ViewPlayer & {
  labelX: number;
  labelAbove: boolean;
};

type Zone = { x: number; y: number; w: number; h: number };

export function layoutPlayers(players: ViewPlayer[], zone: Zone): LaidOutPlayer[] {
  const r = PLAYER_TOKEN / 2;
  const lw = PLAYER_LABEL_W;
  const lh = PLAYER_LABEL_H;
  const laid: LaidOutPlayer[] = players.map((p) => {
    const wouldOverflowBottom = p.y + r + lh + 6 > zone.y + zone.h - 8;
    const wouldOverflowTop = p.y - r - lh - 6 < zone.y + 8;
    let labelAbove = wouldOverflowBottom && !wouldOverflowTop;
    let labelX = 0;
    const left = p.x - lw / 2;
    const right = p.x + lw / 2;
    if (left < zone.x + 10) labelX = zone.x + 10 + lw / 2 - p.x;
    if (right > zone.x + zone.w - 10) labelX = zone.x + zone.w - 10 - lw / 2 - p.x;
    return { ...p, labelX, labelAbove };
  });

  const rect = (p: LaidOutPlayer) => {
    const cy = p.labelAbove ? p.y - r - lh / 2 - 6 : p.y + r + lh / 2 + 4;
    return {
      x: p.x + p.labelX - lw / 2,
      y: cy - lh / 2,
      w: lw,
      h: lh,
    };
  };

  const overlap = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  laid.sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < laid.length; i++) {
    for (let j = 0; j < i; j++) {
      if (!overlap(rect(laid[i]), rect(laid[j]))) continue;
      const wouldOverflowBottom = laid[i].y + r + lh + 6 > zone.y + zone.h - 8;
      if (wouldOverflowBottom) {
        laid[i].labelAbove = true;
        laid[j].labelAbove = true;
      } else {
        laid[i].labelAbove = !laid[j].labelAbove;
      }
      const dir = laid[i].x >= laid[j].x ? 1 : -1;
      laid[i].labelX += dir * 36;
      const left = laid[i].x + laid[i].labelX - lw / 2;
      const right = laid[i].x + laid[i].labelX + lw / 2;
      if (left < zone.x + 10) laid[i].labelX = zone.x + 10 + lw / 2 - laid[i].x;
      if (right > zone.x + zone.w - 10) laid[i].labelX = zone.x + zone.w - 10 - lw / 2 - laid[i].x;
    }
  }
  return laid;
}
