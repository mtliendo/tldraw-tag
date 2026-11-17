import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ART_INSET, PLAYER_TOKEN, minZoneSize } from "@inkt/shared";
import { crowdLabelScale, layoutPlayers, liveLabelScale, shortPlayerName } from "./layoutPlayers";
import type { ViewPlayer } from "./types";

function player(i: number, x: number, y: number, extra: Partial<ViewPlayer> = {}): ViewPlayer {
  return {
    id: `p${i}`,
    sessionId: `s${i}`,
    name: i === 0 ? "Stencil" : `Bot${i}`,
    avatar: "bolt",
    tint: 0,
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
    assert.ok(liveLabelScale(20, 1.5, { w: 480, h: 270 }) < crowdLabelScale(20, 1.5));
  });

  it("shows every name for 20 packed players", () => {
    const players: ViewPlayer[] = [];
    const cols = 5;
    const rows = 4;
    for (let i = 0; i < 20; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      players.push(player(i, 420 + c * (PLAYER_TOKEN + 6), 260 + r * (PLAYER_TOKEN + 6)));
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
          z.x + ART_INSET.left + (c + 0.5) * ((z.w - ART_INSET.left - ART_INSET.right) / cols),
          z.y + ART_INSET.top + (r + 0.5) * ((z.h - ART_INSET.top - ART_INSET.bottom) / 4),
        ),
      );
    }
    const laid = layoutPlayers(players, z, liveLabelScale(20, 1.5, z));
    assert.equal(laid.filter((p) => p.showLabel).length, 20);
    for (const p of laid) {
      assert.ok(p.x - ART_INSET.left >= z.x - 0.5, `${p.name} art left of min zone`);
      assert.ok(p.x + ART_INSET.right <= z.x + z.w + 0.5, `${p.name} art right of min zone`);
      assert.ok(p.y - ART_INSET.top >= z.y - 0.5, `${p.name} art above min zone`);
      assert.ok(p.y + ART_INSET.bottom <= z.y + z.h + 0.5, `${p.name} art below min zone`);
    }
    for (const p of laid.filter((x) => x.showLabel)) {
      const label = {
        x: p.x + p.labelX - p.labelW / 2,
        y: p.y + p.labelY - p.labelH / 2,
        w: p.labelW,
        h: p.labelH,
      };
      assert.ok(label.x >= z.x - 1, `${p.name} clipped left`);
      assert.ok(label.x + label.w <= z.x + z.w + 1, `${p.name} clipped right`);
    }
    const r = PLAYER_TOKEN / 2;
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

  it("keeps labels out of a center leaderboard hole", () => {
    const z = { x: 0, y: 0, w: 800, h: 450 };
    const hole = { x: 160, y: 80, w: 480, h: 280 };
    const players: ViewPlayer[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      players.push(player(i, 400 + Math.cos(a) * 300, 225 + Math.sin(a) * 170));
    }
    const laid = layoutPlayers(players, z, 1, null, { clamp: z, avoid: [hole] });
    const hits = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w - 4 && a.x + a.w > b.x + 4 && a.y < b.y + b.h - 4 && a.y + a.h > b.y + 4;
    for (const p of laid.filter((x) => x.showLabel)) {
      const label = {
        x: p.x + p.labelX - p.labelW / 2,
        y: p.y + p.labelY - p.labelH / 2,
        w: p.labelW,
        h: p.labelH,
      };
      assert.equal(hits(label, hole), false, `${p.name} sat under the leaderboard`);
    }
  });

  it("keeps names up to 10 characters and ellipsizes longer ones", () => {
    assert.equal(shortPlayerName("Ada"), "Ada");
    assert.equal(shortPlayerName("Graphite"), "Graphite");
    assert.equal(shortPlayerName("Scribble"), "Scribble");
    assert.equal(shortPlayerName("Nibbly"), "Nibbly");
    assert.equal(shortPlayerName("Scribbleton"), "Scribblet…");
    const laid = layoutPlayers(
      [player(0, 500, 300, { name: "Graphite" }), player(1, 620, 300, { name: "Scribble" })],
      { x: 0, y: 0, w: 900, h: 600 },
      1,
    );
    for (const p of laid) {
      assert.ok(p.labelW >= 104, `${p.name} pill too narrow (${p.labelW.toFixed(1)})`);
    }
  });

  it("does not stack name pills in a late shrinking zone", () => {
    const z = { x: 200, y: 120, w: 1000, h: 562 };
    const players: ViewPlayer[] = [];
    const cols = 5;
    for (let i = 0; i < 20; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      players.push(
        player(
          i,
          z.x + ART_INSET.left + 20 + (c + 0.5) * ((z.w - ART_INSET.left - ART_INSET.right - 40) / cols),
          z.y + ART_INSET.top + 10 + (r + 0.5) * ((z.h - ART_INSET.top - ART_INSET.bottom - 20) / 4),
          { name: i === 0 ? "Marker" : `P${i}`, isIt: i === 0 },
        ),
      );
    }
    const laid = layoutPlayers(players, z, liveLabelScale(20, 1.5, z));
    const shown = laid.filter((p) => p.showLabel);
    assert.equal(shown.length, 20);
    const hits = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w - 2 && a.x + a.w > b.x + 2 && a.y < b.y + b.h - 2 && a.y + a.h > b.y + 2;
    for (let i = 0; i < shown.length; i++) {
      const a = {
        x: shown[i].x + shown[i].labelX - shown[i].labelW / 2,
        y: shown[i].y + shown[i].labelY - shown[i].labelH / 2,
        w: shown[i].labelW,
        h: shown[i].labelH,
      };
      assert.ok(a.y >= z.y + 2, `${shown[i].name} above the zone`);
      assert.ok(a.y + a.h <= z.y + z.h - 2, `${shown[i].name} below the zone`);
      for (let j = i + 1; j < shown.length; j++) {
        const b = {
          x: shown[j].x + shown[j].labelX - shown[j].labelW / 2,
          y: shown[j].y + shown[j].labelY - shown[j].labelH / 2,
          w: shown[j].labelW,
          h: shown[j].labelH,
        };
        assert.equal(hits(a, b), false, `${shown[i].name} stacked on ${shown[j].name}`);
      }
    }
  });

  it("flips a top-wall name below the critter, inside the zone", () => {
    const z = { x: 120, y: 80, w: 900, h: 560 };
    const laid = layoutPlayers(
      [player(1, 500, z.y + ART_INSET.top, { name: "Lana", isIt: false })],
      z,
      1,
    );
    const lana = laid[0];
    assert.equal(lana.labelSide, "below");
    const top = lana.y + lana.labelY - lana.labelH / 2;
    const bottom = lana.y + lana.labelY + lana.labelH / 2;
    assert.ok(top >= z.y + 2, `Lana pill top ${top.toFixed(1)} vs wall ${z.y}`);
    assert.ok(bottom <= z.y + z.h - 2, `Lana pill bottom ${bottom.toFixed(1)}`);
  });

  it("flips a bottom-wall IT pill above even when the pack is crowded inside", () => {
    const z = { x: 0, y: 0, w: 900, h: 560 };
    const players: ViewPlayer[] = [
      player(0, 450, z.y + z.h - ART_INSET.bottom, { name: "Marker", isIt: true }),
    ];
    for (let i = 1; i < 12; i++) {
      players.push(
        player(i, 300 + (i % 4) * 80, 220 + Math.floor(i / 4) * 70, { name: `P${i}`, isIt: false }),
      );
    }
    const laid = layoutPlayers(players, z, crowdLabelScale(12, 1.5));
    const marker = laid.find((p) => p.name === "Marker")!;
    assert.ok(marker.showLabel, "IT Marker should keep a label");
    assert.notEqual(marker.labelSide, "below");
    const top = marker.y + marker.labelY - marker.labelH / 2;
    const bottom = marker.y + marker.labelY + marker.labelH / 2;
    assert.ok(top >= z.y + 2, `IT pill top ${top.toFixed(1)}`);
    assert.ok(bottom <= z.y + z.h - 2, `IT pill sat on the wall (${bottom.toFixed(1)} vs ${z.h})`);
  });

  it("keeps labels off paver walls", () => {
    const z = { x: 0, y: 0, w: 800, h: 450 };
    const wall = { x: 360, y: 210, w: 140, h: 26 };
    const laid = layoutPlayers([player(0, 430, 248, { name: "Graphite" })], z, 1, null, {
      clamp: z,
      avoid: [wall],
    });
    const hits = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w - 2 && a.x + a.w > b.x + 2 && a.y < b.y + b.h - 2 && a.y + a.h > b.y + 2;
    for (const p of laid.filter((x) => x.showLabel)) {
      const label = {
        x: p.x + p.labelX - p.labelW / 2,
        y: p.y + p.labelY - p.labelH / 2,
        w: p.labelW,
        h: p.labelH,
      };
      assert.equal(hits(label, wall), false, `${p.name} sat on a wall`);
    }
  });
});
