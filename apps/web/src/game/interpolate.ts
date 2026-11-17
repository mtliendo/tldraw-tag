import { INTERP_DELAY_MS, PLAYER_RADIUS, lerp } from "@inkt/shared";
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
  const zone = b.zone;
  const players: ViewPlayer[] = b.players.map((p) => {
    const o = prev.get(p.id);
    if (!o) return { ...p, ...clampToZone(p.x, p.y, zone) };
    return {
      ...p,
      ...clampToZone(lerp(o.x, p.x, t), lerp(o.y, p.y, t), zone),
    };
  });
  const decoyPrev = new Map(a.decoys.map((d) => [d.id, d]));
  const decoys = b.decoys.map((d) => {
    const o = decoyPrev.get(d.id);
    if (!o) return { ...d, ...clampToZone(d.x, d.y, zone) };
    return { ...d, ...clampToZone(lerp(o.x, d.x, t), lerp(o.y, d.y, t), zone) };
  });
  return clampState({
    ...b,
    shrinkIn: lerp(a.shrinkIn, b.shrinkIn, t),
    players,
    decoys,
  });
}

function clampState(state: ViewState): ViewState {
  const zone = state.zone;
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, ...clampToZone(p.x, p.y, zone) })),
    decoys: state.decoys.map((d) => ({ ...d, ...clampToZone(d.x, d.y, zone) })),
  };
}

function clampToZone(x: number, y: number, zone: { x: number; y: number; w: number; h: number }) {
  const inset = PLAYER_RADIUS + 2;
  return {
    x: Math.min(Math.max(x, zone.x + inset), zone.x + zone.w - inset),
    y: Math.min(Math.max(y, zone.y + inset), zone.y + zone.h - inset),
  };
}
