import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ART_INSET, clampToZoneArt } from "@inkt/shared";
import { Interpolator, clampState } from "./interpolate";
import { EMPTY_VIEW, type ViewPlayer, type ViewState } from "./types";

function player(id: string, x: number, y: number, extra: Partial<ViewPlayer> = {}): ViewPlayer {
  return {
    id,
    sessionId: id,
    name: id,
    avatar: "bear",
    tint: 0,
    x,
    y,
    vx: 0,
    vy: 0,
    isIt: false,
    isBot: true,
    score: 0,
    powerId: "",
    charges: 0,
    ghost: false,
    frozen: false,
    boosting: false,
    hasShield: false,
    ...extra,
  };
}

function view(partial: Partial<ViewState>): ViewState {
  return { ...EMPTY_VIEW, phase: "playing", ...partial };
}

describe("interpolator art clamp", () => {
  it("clamps a player sitting on the old top wall into a smaller zone", () => {
    const big = { x: 0, y: 0, w: 1600, h: 900 };
    const small = { x: 200, y: 120, w: 1000, h: 562 };
    const atTop = clampToZoneArt(800, 0, big);
    const state = clampState(
      view({
        zone: small,
        targetZone: small,
        players: [player("lana", atTop.x, atTop.y, { name: "Lana" })],
      }),
    );
    const lana = state.players[0];
    assert.ok(lana.y >= small.y + ART_INSET.top - 0.01, `Lana y ${lana.y} vs ${small.y + ART_INSET.top}`);
    assert.ok(lana.y - ART_INSET.top >= small.y - 0.51);
  });

  it("lerps the zone with the players so the wall and clamp stay in lockstep", () => {
    const interp = new Interpolator();
    interp.delay = 80;
    const aZone = { x: 0, y: 0, w: 1600, h: 900 };
    const bZone = { x: 80, y: 45, w: 1440, h: 810 };
    const aPos = clampToZoneArt(800, 0, aZone);
    const bPos = clampToZoneArt(800, 0, bZone);
    const t0 = performance.now();
    interp.push(
      view({
        zone: aZone,
        targetZone: bZone,
        players: [player("lana", aPos.x, aPos.y)],
      }),
    );
    const snaps = (interp as unknown as { snaps: { t: number }[] }).snaps;
    snaps[0].t = t0 - 120;
    interp.push(
      view({
        zone: bZone,
        targetZone: bZone,
        shrinking: true,
        players: [player("lana", bPos.x, bPos.y)],
      }),
    );
    snaps[1].t = t0 - 40;
    const sampled = interp.sample();
    assert.ok(sampled);
    assert.ok(sampled!.zone.y > aZone.y);
    assert.ok(sampled!.zone.y < bZone.y + 0.01);
    const lana = sampled!.players[0];
    assert.ok(lana.y >= sampled!.zone.y + ART_INSET.top - 0.05);
  });
});
