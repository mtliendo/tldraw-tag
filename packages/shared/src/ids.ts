import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "./constants";

export function rng(seed = Math.random() * 1e9) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function makeRoomCode(rand: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(rand() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function length(x: number, y: number): number {
  return Math.hypot(x, y);
}

export function normalize(x: number, y: number): { x: number; y: number } {
  const l = Math.hypot(x, y);
  if (l < 1e-6) return { x: 0, y: 0 };
  return { x: x / l, y: y / l };
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpRect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  t: number,
) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
  };
}

export function circleHitsAabb(
  cx: number,
  cy: number,
  r: number,
  rect: { x: number; y: number; w: number; h: number },
): { hit: boolean; nx: number; ny: number; depth: number } {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  const d2 = dx * dx + dy * dy;
  if (d2 > r * r) return { hit: false, nx: 0, ny: 0, depth: 0 };
  const d = Math.sqrt(d2) || 0.0001;
  return { hit: true, nx: dx / d, ny: dy / d, depth: r - d };
}
