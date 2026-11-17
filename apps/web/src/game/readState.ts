import type { ViewState } from "./types";

function mapValues<T>(map: { forEach: (cb: (v: T, k: string) => void) => void } | undefined): T[] {
  const out: T[] = [];
  map?.forEach((v) => out.push(v));
  return out;
}

export function readRoomState(state: any): ViewState {
  const players = mapValues<any>(state.players).map((p) => ({
    id: String(p.id),
    sessionId: String(p.sessionId ?? ""),
    name: String(p.name),
    avatar: String(p.avatar),
    x: Number(p.x) || 0,
    y: Number(p.y) || 0,
    vx: Number(p.vx) || 0,
    vy: Number(p.vy) || 0,
    isIt: Boolean(p.isIt),
    isBot: Boolean(p.isBot),
    score: Number(p.score) || 0,
    powerId: String(p.powerId ?? ""),
    charges: Number(p.charges) || 0,
    ghost: Boolean(p.ghost),
    frozen: Boolean(p.frozen),
    boosting: Boolean(p.boosting),
    hasShield: Boolean(p.hasShield),
  }));

  return {
    code: String(state.code ?? ""),
    phase: String(state.phase ?? "lobby"),
    timeLeft: Number(state.timeLeft) || 0,
    roundLength: Number(state.roundLength) || 75,
    zone: {
      x: Number(state.zoneX) || 0,
      y: Number(state.zoneY) || 0,
      w: Number(state.zoneW) || 1600,
      h: Number(state.zoneH) || 900,
    },
    targetZone: {
      x: Number(state.targetZoneX) || 0,
      y: Number(state.targetZoneY) || 0,
      w: Number(state.targetZoneW) || 1600,
      h: Number(state.targetZoneH) || 900,
    },
    shrinkIn: Number(state.shrinkIn) || 0,
    shrinking: Boolean(state.shrinking),
    itId: String(state.itId ?? ""),
    itName: String(state.itName ?? ""),
    enabledPowers: Array.from(state.enabledPowers ?? []).map(String),
    players,
    powerUps: mapValues<any>(state.powerUps).map((p) => ({
      id: String(p.id),
      kind: String(p.kind),
      x: Number(p.x) || 0,
      y: Number(p.y) || 0,
    })),
    pulses: mapValues<any>(state.pulses).map((p) => ({
      id: String(p.id),
      kind: String(p.kind),
      x: Number(p.x) || 0,
      y: Number(p.y) || 0,
      progress: Number(p.progress) || 0,
    })),
    walls: mapValues<any>(state.walls).map((w) => ({
      id: String(w.id),
      x: Number(w.x) || 0,
      y: Number(w.y) || 0,
      w: Number(w.w) || 0,
      h: Number(w.h) || 0,
    })),
    decoys: mapValues<any>(state.decoys).map((d) => ({
      id: String(d.id),
      ownerId: String(d.ownerId),
      name: String(d.name),
      avatar: String(d.avatar),
      x: Number(d.x) || 0,
      y: Number(d.y) || 0,
    })),
    leaderboard: Array.from(state.leaderboard ?? []).map((row: any) => ({
      id: String(row.id),
      name: String(row.name),
      avatar: String(row.avatar),
      score: Number(row.score) || 0,
      isIt: Boolean(row.isIt),
      isBot: Boolean(row.isBot),
    })),
    lastAnnounce: String(state.lastAnnounce ?? ""),
  };
}
