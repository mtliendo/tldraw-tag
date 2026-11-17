import { ART_INSET, INTERP_DELAY_MS, clampToZoneArt, lerp, lerpRect, separateAabbFromAabb } from "@inkt/shared";
import type { ViewPlayer, ViewState } from "./types";

type Snap = { t: number; state: ViewState };

export class Interpolator {
  private snaps: Snap[] = [];
  delay = INTERP_DELAY_MS;

  push(state: ViewState) {
    this.snaps.push({ t: performance.now(), state });
    if (this.snaps.length > 12) this.snaps.shift();
  }

  sample(): ViewState | null {
    if (this.snaps.length === 0) return null;
    if (this.snaps.length === 1) {
      return clampState(this.snaps[0].state);
    }
    const renderAt = performance.now() - this.delay;
    let i = this.snaps.length - 1;
    while (i > 0 && this.snaps[i].t > renderAt) i -= 1;
    const a = this.snaps[i];
    const b = this.snaps[Math.min(i + 1, this.snaps.length - 1)];
    if (a === b || b.t === a.t) return clampState(b.state);
    const t = Math.max(0, Math.min(1, (renderAt - a.t) / (b.t - a.t)));
    return mix(a.state, b.state, t);
  }
}

function mix(a: ViewState, b: ViewState, t: number): ViewState {
  const prev = new Map(a.players.map((p) => [p.id, p]));
  const zone = lerpRect(a.zone, b.zone, t);
  const targetZone = lerpRect(a.targetZone, b.targetZone, t);
  const players: ViewPlayer[] = b.players.map((p) => {
    const o = prev.get(p.id);
    if (!o) return { ...p, ...clampBody(p.x, p.y, zone, b.walls, p.ghost) };
    return {
      ...p,
      ...clampBody(lerp(o.x, p.x, t), lerp(o.y, p.y, t), zone, b.walls, p.ghost),
    };
  });
  const decoyPrev = new Map(a.decoys.map((d) => [d.id, d]));
  const decoys = b.decoys.map((d) => {
    const o = decoyPrev.get(d.id);
    if (!o) return { ...d, ...clampBody(d.x, d.y, zone, b.walls) };
    return { ...d, ...clampBody(lerp(o.x, d.x, t), lerp(o.y, d.y, t), zone, b.walls) };
  });
  return clampState({
    ...b,
    zone,
    targetZone,
    shrinkIn: lerp(a.shrinkIn, b.shrinkIn, t),
    players,
    decoys,
  });
}

function clampBody(
  x: number,
  y: number,
  zone: ViewState["zone"],
  walls: ViewState["walls"],
  ghost = false,
) {
  let next = clampToZoneArt(x, y, zone);
  if (!ghost) {
    for (const wall of walls) {
      next = separateAabbFromAabb(next.x, next.y, ART_INSET, wall);
    }
    next = clampToZoneArt(next.x, next.y, zone);
  }
  return next;
}

export function clampState(state: ViewState): ViewState {
  const zone = state.zone;
  const walls = state.walls;
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, ...clampBody(p.x, p.y, zone, walls, p.ghost) })),
    decoys: state.decoys.map((d) => ({ ...d, ...clampBody(d.x, d.y, zone, walls) })),
  };
}
