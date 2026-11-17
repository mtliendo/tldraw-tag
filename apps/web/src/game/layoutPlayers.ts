import { PLAYER_LABEL_H, PLAYER_TOKEN } from "@inkt/shared";
import type { ViewPlayer } from "./types";

export type LabelSide = "below" | "above" | "left" | "right";

export type LaidOutPlayer = ViewPlayer & {
  labelX: number;
  labelY: number;
  labelAbove: boolean;
  labelSide: LabelSide;
  labelLeader: boolean;
  labelStack: number;
  labelW: number;
  labelH: number;
  showLabel: boolean;
};

type Zone = { x: number; y: number; w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number };
type Slot = { side: LabelSide; ox: number; oy: number };

const ALWAYS_SHOW = 22;
const CLEAR = 3;

export function crowdLabelScale(n: number, base = 1) {
  if (n <= 10) return base;
  if (n <= 14) return base * 0.84;
  if (n <= 20) return base * 0.7;
  return base * 0.6;
}

function labelWidth(name: string, scale: number, kind: "it" | "you" | "plain") {
  const text = kind === "it" ? `it · ${name}` : kind === "you" ? `you · ${name}` : name;
  return Math.min(110 * scale, Math.max(28 * scale, (14 + text.length * 7.4) * scale));
}

function overlapArea(a: Rect, b: Rect, pad = 0) {
  const x = Math.max(0, Math.min(a.x + a.w + pad, b.x + b.w) - Math.max(a.x - pad, b.x));
  const y = Math.max(0, Math.min(a.y + a.h + pad, b.y + b.h) - Math.max(a.y - pad, b.y));
  return x * y;
}

function slots(preferAbove: boolean, scale: number): Slot[] {
  const step = 16 * scale;
  const offs = [0, step, -step, 2 * step, -2 * step, 3 * step, -3 * step, 4.4 * step, -4.4 * step];
  const order: LabelSide[] = preferAbove
    ? ["above", "below", "right", "left"]
    : ["below", "above", "right", "left"];
  const out: Slot[] = [];
  for (const side of order) {
    for (const o of offs) {
      if (side === "below" || side === "above") out.push({ side, ox: o, oy: 0 });
      else out.push({ side, ox: 0, oy: o });
    }
  }
  return out;
}

function pillRect(
  p: { x: number; y: number; labelW: number },
  side: LabelSide,
  ox: number,
  oy: number,
  r: number,
  lh: number,
  gap: number,
): Rect {
  const w = p.labelW;
  const h = lh;
  if (side === "above") return { x: p.x - w / 2 + ox, y: p.y - r - gap - h + oy, w, h };
  if (side === "below") return { x: p.x - w / 2 + ox, y: p.y + r + gap + oy, w, h };
  if (side === "left") return { x: p.x - r - gap - w + ox, y: p.y - h / 2 + oy, w, h };
  return { x: p.x + r + gap + ox, y: p.y - h / 2 + oy, w, h };
}

export type LayoutOptions = {
  selfId?: string | null;
  clamp?: Rect;
  avoid?: Rect[];
};

function pushOut(rect: Rect, hole: Rect, pad = 6, box?: Rect): Rect {
  if (overlapArea(rect, hole, 0) === 0) return rect;
  const options = [
    { ...rect, y: hole.y - pad - rect.h },
    { ...rect, y: hole.y + hole.h + pad },
    { ...rect, x: hole.x - pad - rect.w },
    { ...rect, x: hole.x + hole.w + pad },
  ];
  let best = options[0];
  let bestScore = Infinity;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  for (const o of options) {
    const r = box ? clampRect(o, box, 4) : o;
    const dx = r.x + r.w / 2 - cx;
    const dy = r.y + r.h / 2 - cy;
    const score = overlapArea(r, hole, 0) * 4000 + dx * dx + dy * dy;
    if (score < bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function clampRect(rect: Rect, box: Rect, pad = 2): Rect {
  const maxX = box.x + box.w - pad - rect.w;
  const maxY = box.y + box.h - pad - rect.h;
  const minX = box.x + pad;
  const minY = box.y + pad;
  return {
    ...rect,
    x: maxX < minX ? box.x + (box.w - rect.w) / 2 : Math.min(Math.max(rect.x, minX), maxX),
    y: maxY < minY ? box.y + (box.h - rect.h) / 2 : Math.min(Math.max(rect.y, minY), maxY),
  };
}

export function layoutPlayers(
  players: ViewPlayer[],
  zone: Zone,
  labelScale = 1,
  selfId?: string | null,
  options?: LayoutOptions,
): LaidOutPlayer[] {
  const r = PLAYER_TOKEN / 2;
  const lh = PLAYER_LABEL_H * labelScale + 2;
  const gaps = [8 * Math.max(0.85, labelScale), 12 * Math.max(0.85, labelScale), 16 * Math.max(0.85, labelScale)];
  const laid: LaidOutPlayer[] = players.map((p) => ({
    ...p,
    labelX: 0,
    labelY: r + gaps[0] + lh / 2,
    labelAbove: false,
    labelSide: "below" as LabelSide,
    labelLeader: false,
    labelStack: 0,
    labelW: labelWidth(
      p.name,
      labelScale,
      p.id === (options?.selfId ?? selfId) ? "you" : p.isIt ? "it" : "plain",
    ),
    labelH: lh,
    showLabel: true,
  }));

  const blobRect = (p: LaidOutPlayer): Rect => ({
    x: p.x - r,
    y: p.y - r,
    w: r * 2,
    h: r * 2,
  });

  const youId = options?.selfId ?? selfId;
  const clampTo = options?.clamp ?? zone;
  const avoid = options?.avoid ?? [];
  const rank = (p: LaidOutPlayer) => {
    if (p.isIt) return 0;
    if (p.id === youId) return 1;
    if (p.frozen) return 2;
    return 3;
  };

  const ranked = [...laid].sort((a, b) => rank(a) - rank(b) || a.y - b.y || a.x - b.x);
  const taken: LaidOutPlayer[] = [];
  const forceShow = players.length <= ALWAYS_SHOW;
  const candidates = (preferAbove: boolean) => slots(preferAbove, labelScale);

  for (const p of ranked) {
    const preferAbove = p.y + r + lh + 12 > zone.y + zone.h * 0.82;
    let best: { slot: Slot; rect: Rect; score: number } | null = null;

    for (const gap of gaps) {
      for (const slot of candidates(preferAbove)) {
        let rect = pillRect(p, slot.side, slot.ox, slot.oy, r, lh, gap);
        rect = clampRect(rect, clampTo, 4);
        let score = 0;
        for (const q of laid) {
          score += overlapArea(rect, blobRect(q), CLEAR) * (q.id === p.id ? 8 : 5);
        }
        for (const q of taken) {
          const other: Rect = {
            x: q.x + q.labelX - q.labelW / 2,
            y: q.y + q.labelY - q.labelH / 2,
            w: q.labelW,
            h: q.labelH,
          };
          score += overlapArea(rect, other, CLEAR) * 7;
        }
        for (const hole of avoid) {
          score += overlapArea(rect, hole, 8) * 18;
        }
        if (!best || score < best.score) best = { slot, rect, score };
        if (score === 0) break;
      }
      if (best && best.score === 0) break;
    }

    if (!best || (best.score > 0 && !forceShow && rank(p) > 1)) {
      p.showLabel = false;
      continue;
    }

    const { slot } = best;
    let rect = best.rect;
    for (const hole of avoid) rect = pushOut(rect, hole, 8, clampTo);
    rect = clampRect(rect, clampTo, 4);
    p.labelSide = slot.side;
    p.labelAbove = slot.side === "above";
    p.labelX = rect.x + rect.w / 2 - p.x;
    p.labelY = rect.y + rect.h / 2 - p.y;
    p.labelLeader = Math.abs(slot.ox) + Math.abs(slot.oy) > 10 || slot.side === "left" || slot.side === "right";
    p.showLabel = true;
    taken.push(p);
  }

  return laid;
}
