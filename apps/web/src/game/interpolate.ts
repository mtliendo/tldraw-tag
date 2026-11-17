import { INTERP_DELAY_MS, ZONE_INSET, lerp } from "@inkt/shared";
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
    if (this.snaps.length === 1) return this.snaps[0].state;
    const renderAt = performance.now() - this.delay;
    let i = this.snaps.length - 1;
    while (i > 0 && this.snaps[i].t > renderAt) i -= 1;
    const a = this.snaps[i];
    const b = this.snaps[Math.min(i + 1, this.snaps.length - 1)];
    if (a === b || b.t === a.t) return b.state;
    const t = Math.max(0, Math.min(1, (renderAt - a.t) / (b.t - a.t)));
    return mix(a.state, b.state, t);
  }
}

function mix(a: ViewState, b: ViewState, t: number): ViewState {
  const prev = new Map(a.players.map((p) => [p.id, p]));
  const players: ViewPlayer[] = b.players.map((p) => {
    const o = prev.get(p.id);
    if (!o) return p;
    return {
      ...p,
      x: lerp(o.x, p.x, t),
      y: lerp(o.y, p.y, t),
    };
  });
  const decoyPrev = new Map(a.decoys.map((d) => [d.id, d]));
  const decoys = b.decoys.map((d) => {
    const o = decoyPrev.get(d.id);
    if (!o) return d;
    return { ...d, x: lerp(o.x, d.x, t), y: lerp(o.y, d.y, t) };
  });
  const zone = {
    x: lerp(a.zone.x, b.zone.x, t),
    y: lerp(a.zone.y, b.zone.y, t),
    w: lerp(a.zone.w, b.zone.w, t),
    h: lerp(a.zone.h, b.zone.h, t),
  };
  return {
    ...b,
    zone,
    players: players.map((p) => ({ ...p, ...clampToZone(p.x, p.y, zone) })),
    decoys: decoys.map((d) => ({ ...d, ...clampToZone(d.x, d.y, zone) })),
  };
}

function clampToZone(x: number, y: number, zone: { x: number; y: number; w: number; h: number }) {
  return {
    x: Math.min(Math.max(x, zone.x + ZONE_INSET), zone.x + zone.w - ZONE_INSET),
    y: Math.min(Math.max(y, zone.y + ZONE_INSET), zone.y + zone.h - ZONE_INSET),
  };
}
