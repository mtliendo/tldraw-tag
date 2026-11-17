import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { minZoneSize } from "@inkt/shared";
import { crowdLabelScale, layoutPlayers } from "./layoutPlayers";
import type { ViewPlayer } from "./types";

function player(i: number, x: number, y: number, extra: Partial<ViewPlayer> = {}): ViewPlayer {
  return {
    id: `p${i}`,
    sessionId: `s${i}`,
    name: i === 0 ? "Stencil" : `Bot${i}`,
    avatar: "bolt",
    x,
    y,
    vx: 0,
    vy: 0,
    isIt: i === 0,
    isBot: i > 0,
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

describe("layoutPlayers", () => {
  it("scales pills down at 20 players", () => {
    assert.equal(crowdLabelScale(8, 1.5), 1.5);
    assert.ok(crowdLabelScale(20, 1.5) < 1.2);
    assert.ok(crowdLabelScale(20, 1.5) > 0.9);
  });

  it("shows every name for 20 packed players", () => {
    const players: ViewPlayer[] = [];
    const cols = 5;
    const rows = 4;
    for (let i = 0; i < 20; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      players.push(player(i, 420 + c * 78, 260 + r * 78));
    }
    const laid = layoutPlayers(players, { x: 400, y: 240, w: 420, h: 340 }, crowdLabelScale(20, 1.5));
    assert.equal(laid.filter((p) => p.showLabel).length, 20);
    const sides = new Set(laid.map((p) => p.labelSide));
    assert.ok(sides.size >= 2, "should use more than one label side");
  });

  it("keeps 20 names in a scaled min zone", () => {
    const zone = minZoneSize(20);
    const z = { x: (1600 - zone.w) / 2, y: (900 - zone.h) / 2, w: zone.w, h: zone.h };
    const players: ViewPlayer[] = [];
    const cols = 5;
    for (let i = 0; i < 20; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      players.push(
        player(
          i,
          z.x + 50 + (c + 0.5) * ((z.w - 100) / cols),
          z.y + 40 + (r + 0.5) * ((z.h - 80) / 4),
        ),
      );
    }
    const laid = layoutPlayers(players, z, crowdLabelScale(20, 1.5));
    assert.equal(laid.filter((p) => p.showLabel).length, 20);
    const r = 36;
    const hits = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w - 2 && a.x + a.w > b.x + 2 && a.y < b.y + b.h - 2 && a.y + a.h > b.y + 2;
    for (const p of laid) {
      if (!p.showLabel) continue;
      const label = {
        x: p.x + p.labelX - p.labelW / 2,
        y: p.y + p.labelY - p.labelH / 2,
        w: p.labelW,
        h: p.labelH,
      };
      for (const q of laid) {
        const blob = { x: q.x - r, y: q.y - r, w: r * 2, h: r * 2 };
        assert.equal(hits(label, blob), false, `${p.name} overlapped ${q.name}`);
      }
    }
  });
});
