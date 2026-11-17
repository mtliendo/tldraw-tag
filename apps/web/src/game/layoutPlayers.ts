import { ART_INSET, PLAYER_LABEL_H, PLAYER_TOKEN, scaleWithPlayer } from "@inkt/shared";
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
const CLEAR = 5;

export function crowdLabelScale(n: number, base = 1) {
  if (n <= 10) return base;
  if (n <= 14) return base * 0.84;
  if (n <= 20) return base * 0.7;
  return base * 0.6;
}

/** Shrink pills further once the zone is a small fraction of the arena. */
export function liveLabelScale(
  n: number,
  base: number,
  zone: { w: number; h: number },
  arena = { w: 1600, h: 900 },
) {
  let s = crowdLabelScale(n, base);
  const ratio = (zone.w * zone.h) / (arena.w * arena.h);
  if (ratio < 0.55) s *= 0.86;
  if (ratio < 0.35) s *= 0.86;
  if (ratio < 0.28) s *= 0.86;
  return s;
}

export function shortPlayerName(name: string, max = 10) {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1))}…`;
}

function labelWidth(name: string, scale: number, kind: "it" | "you" | "plain") {
  const text = kind === "it" ? `IT ${name}` : kind === "you" ? `${name} you` : name;
  return Math.min(160 * scale, Math.max(52 * scale, (30 + text.length * 9.6) * scale));
}

function overlapArea(a: Rect, b: Rect, pad = 0) {
  const x = Math.max(0, Math.min(a.x + a.w + pad, b.x + b.w) - Math.max(a.x - pad, b.x));
  const y = Math.max(0, Math.min(a.y + a.h + pad, b.y + b.h) - Math.max(a.y - pad, b.y));
  return x * y;
}

function slots(order: LabelSide[], scale: number): Slot[] {
  const step = 16 * scale;
  const offs = [0, step, -step, 2 * step, -2 * step, 3 * step, -3 * step, 4.4 * step, -4.4 * step];
  const out: Slot[] = [];
  for (const side of order) {
    for (const o of offs) {
      if (side === "below" || side === "above") out.push({ side, ox: o, oy: 0 });
      else out.push({ side, ox: 0, oy: o });
    }
  }
  return out;
}

/** Sides that keep the pill inside the zone when a player is against a wall. */
export function interiorLabelSides(
  p: { x: number; y: number; labelW: number },
  zone: Zone,
  lh: number,
): LabelSide[] {
  const nearTop = p.y - zone.y < ART_INSET.top + lh + 18;
  const nearBottom = zone.y + zone.h - p.y < ART_INSET.bottom + lh + 18;
  const nearLeft = p.x - zone.x < PLAYER_TOKEN / 2 + p.labelW + 14;
  const nearRight = zone.x + zone.w - p.x < PLAYER_TOKEN / 2 + p.labelW + 14;
  const forbidden = new Set<LabelSide>();
  if (nearTop) forbidden.add("above");
  if (nearBottom) forbidden.add("below");
  if (nearLeft) forbidden.add("left");
  if (nearRight) forbidden.add("right");
  const preferred: LabelSide[] = [];
  const push = (side: LabelSide) => {
    if (!forbidden.has(side) && !preferred.includes(side)) preferred.push(side);
  };
  if (nearBottom) push("above");
  if (nearTop) push("below");
  if (nearLeft) push("right");
  if (nearRight) push("left");
  if (nearBottom || p.y + PLAYER_TOKEN / 2 + lh + 12 > zone.y + zone.h * 0.82) push("above");
  else push("below");
  push("above");
  push("below");
  push("right");
  push("left");
  return preferred.length ? preferred : ["below", "above", "right", "left"];
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
    const r = box ? clampRect(o, box, 8) : o;
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
  const gaps = [6, 10, 14, 20, 28].map((n) => n * Math.max(0.85, labelScale));
  const laid: LaidOutPlayer[] = players.map((p) => ({
    ...p,
    labelX: 0,
    labelY: r + gaps[0] + lh / 2,
    labelAbove: false,
    labelSide: "below" as LabelSide,
    labelLeader: false,
    labelStack: 0,
    labelW: labelWidth(
      shortPlayerName(p.name),
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
  const edgePad = 8;

  for (const p of ranked) {
    const order = interiorLabelSides(p, zone, lh);
    let best: { slot: Slot; rect: Rect; score: number } | null = null;

    for (const gap of gaps) {
      for (const slot of slots(order, labelScale)) {
        let rect = pillRect(p, slot.side, slot.ox, slot.oy, r, lh, gap);
        rect = clampRect(rect, clampTo, edgePad);
        let score = Math.max(0, order.indexOf(slot.side)) * 18;
        for (const q of laid) {
          score += overlapArea(rect, blobRect(q), CLEAR) * (q.id === p.id ? 8 : 10);
          if (q.id === p.id) {
            const head = { x: q.x - ART_INSET.left, y: q.y - ART_INSET.top, w: ART_INSET.left + ART_INSET.right, h: ART_INSET.top - r };
            score += overlapArea(rect, head, 2) * 12;
          }
        }
        for (const q of taken) {
          const other: Rect = {
            x: q.x + q.labelX - q.labelW / 2,
            y: q.y + q.labelY - q.labelH / 2,
            w: q.labelW,
            h: q.labelH,
          };
          score += overlapArea(rect, other, CLEAR) * 22;
        }
        for (const hole of avoid) {
          score += overlapArea(rect, hole, 10) * 28;
        }
        if (rect.y < zone.y + edgePad) score += 900;
        if (rect.y + rect.h > zone.y + zone.h - edgePad) score += 900;
        if (rect.x < zone.x + edgePad) score += 500;
        if (rect.x + rect.w > zone.x + zone.w - edgePad) score += 500;
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
    for (const hole of avoid) rect = pushOut(rect, hole, 10, clampTo);
    rect = clampRect(rect, clampTo, edgePad);
    p.labelSide = slot.side;
    p.labelAbove = slot.side === "above";
    p.labelX = rect.x + rect.w / 2 - p.x;
    p.labelY = rect.y + rect.h / 2 - p.y;
    p.labelLeader = Math.abs(slot.ox) + Math.abs(slot.oy) > 10 || slot.side === "left" || slot.side === "right";
    p.showLabel = true;
    taken.push(p);
  }

  separateLabels(taken, laid, clampTo, avoid);

  return laid;
}

function labelBox(p: LaidOutPlayer): Rect {
  return {
    x: p.x + p.labelX - p.labelW / 2,
    y: p.y + p.labelY - p.labelH / 2,
    w: p.labelW,
    h: p.labelH,
  };
}

function separateLabels(taken: LaidOutPlayer[], blobs: LaidOutPlayer[], clampTo: Rect, avoid: Rect[] = []) {
  const ordered = [...taken].sort((a, b) => a.x - b.x || a.y - b.y);
  for (let iter = 0; iter < 18; iter++) {
    for (const p of ordered) {
      let rect = labelBox(p);
      for (const q of taken) {
        if (q.id === p.id) continue;
        const other = labelBox(q);
        if (overlapArea(rect, other, 2) === 0) continue;
        const dx = rect.x + rect.w / 2 - (other.x + other.w / 2);
        const dy = rect.y + rect.h / 2 - (other.y + other.h / 2);
        const sameRow = Math.abs(dy) < Math.max(rect.h, other.h);
        const dirX = dx === 0 ? (p.x >= q.x ? 1 : -1) : Math.sign(dx);
        rect.x += dirX * (sameRow ? 16 : 8);
        if (!sameRow) rect.y += (dy === 0 ? 1 : Math.sign(dy)) * 6;
        else if (iter > 8) rect.y += (p.y >= q.y ? 1 : -1) * 4;
      }
      for (const q of blobs) {
        const blob = { x: q.x - PLAYER_TOKEN / 2, y: q.y - PLAYER_TOKEN / 2, w: PLAYER_TOKEN, h: PLAYER_TOKEN };
        if (overlapArea(rect, blob, 2) === 0) continue;
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        if (iter < 10) {
          rect.x += (cx - q.x >= 0 ? 1 : -1) * 8;
          rect.y += (cy - q.y >= 0 ? 1 : -1) * 8;
        } else if (Math.abs(cx - q.x) > Math.abs(cy - q.y)) {
          rect.x = cx >= q.x ? blob.x + blob.w + 4 : blob.x - 4 - rect.w;
        } else {
          rect.y = cy >= q.y ? blob.y + blob.h + 4 : blob.y - 4 - rect.h;
        }
      }
      for (const hole of avoid) {
        if (overlapArea(rect, hole, 4) === 0) continue;
        rect = pushOut(rect, hole, 10, clampTo);
      }
      rect = clampRect(rect, clampTo, 8);
      p.labelX = rect.x + rect.w / 2 - p.x;
      p.labelY = rect.y + rect.h / 2 - p.y;
      p.labelLeader =
        Math.hypot(p.labelX, p.labelY) > PLAYER_TOKEN / 2 + scaleWithPlayer(14) ||
        Math.abs(p.labelX) > p.labelW / 2;
    }
  }
}
