import { PLAYER_LABEL_H, PLAYER_TOKEN } from "@inkt/shared";
import type { ViewPlayer } from "./types";

export type LaidOutPlayer = ViewPlayer & {
  labelX: number;
  labelAbove: boolean;
  labelStack: number;
  labelW: number;
};

type Zone = { x: number; y: number; w: number; h: number };

function labelWidth(name: string) {
  return Math.min(108, Math.max(36, 18 + name.length * 8.2));
}

function overlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function layoutPlayers(players: ViewPlayer[], _zone: Zone, labelScale = 1): LaidOutPlayer[] {
  const r = PLAYER_TOKEN / 2;
  const lh = PLAYER_LABEL_H * labelScale;
  const laid: LaidOutPlayer[] = players.map((p) => ({
    ...p,
    labelX: 0,
    labelAbove: false,
    labelStack: 0,
    labelW: labelWidth(p.name),
  }));

  const rect = (p: LaidOutPlayer) => ({
    x: p.x - p.labelW / 2,
    y: p.y + r + 8 + p.labelStack * (lh + 4),
    w: p.labelW + 6,
    h: lh,
  });

  laid.sort((a, b) => a.y - b.y || a.x - b.x);
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < laid.length; i++) {
      for (let j = 0; j < i; j++) {
        if (!overlap(rect(laid[i]), rect(laid[j]))) continue;
        laid[i].labelStack = Math.max(laid[i].labelStack, laid[j].labelStack + 1);
        moved = true;
      }
    }
    if (!moved) break;
  }

  for (const p of laid) p.labelStack = Math.min(p.labelStack, 3);
  return laid;
}
