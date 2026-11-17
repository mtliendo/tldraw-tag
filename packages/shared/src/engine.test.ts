import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TagEngine } from "./engine";
import { ARENA_H, ARENA_W, PLAYER_RADIUS, ZONE_MIN_H, ZONE_MIN_W } from "./constants";
import { rng } from "./ids";

describe("TagEngine loop", () => {
  it("runs create -> bots -> play -> shrink -> leaderboard", () => {
    const engine = new TagEngine({
      code: "TEST",
      roundLength: 12,
      shrinkInterval: 3,
      rand: rng(42),
    });
    engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.spawnBots(10);
    assert.equal(Object.keys(engine.state.players).length, 11);
    engine.start();
    assert.equal(engine.state.phase, "playing");
    assert.ok(engine.state.itId);

    const startZone = { ...engine.state.zone };
    for (let i = 0; i < 400 && engine.state.phase !== "ended"; i++) {
      engine.tick(0.05);
    }

    assert.equal(engine.state.phase, "ended");
    assert.ok(engine.state.zone.w < startZone.w);
    assert.ok(engine.state.zone.h < startZone.h);
    assert.ok(engine.state.zone.w >= ZONE_MIN_W - 1);
    assert.ok(engine.state.zone.h >= ZONE_MIN_H - 1);
    assert.ok(engine.state.leaderboard.length >= 11);
    const it = engine.state.leaderboard.find((row) => row.isIt);
    assert.ok(it);
    for (const p of Object.values(engine.state.players)) {
      assert.ok(p.x >= engine.state.zone.x + PLAYER_RADIUS);
      assert.ok(p.x <= engine.state.zone.x + engine.state.zone.w - PLAYER_RADIUS);
      assert.ok(p.y >= engine.state.zone.y + PLAYER_RADIUS);
      assert.ok(p.y <= engine.state.zone.y + engine.state.zone.h - PLAYER_RADIUS);
    }
  });

  it("keeps players inside the original arena", () => {
    const engine = new TagEngine({ roundLength: 4, rand: rng(7) });
    engine.addPlayer({ name: "A", avatar: "orb" });
    engine.addPlayer({ name: "B", avatar: "fox" });
    engine.start();
    for (let i = 0; i < 80; i++) engine.tick(0.05);
    for (const p of Object.values(engine.state.players)) {
      assert.ok(p.x >= 0 && p.x <= ARENA_W);
      assert.ok(p.y >= 0 && p.y <= ARENA_H);
    }
  });

  it("transfers IT on overlap and honors shield", () => {
    const engine = new TagEngine({ roundLength: 8, rand: rng(3) });
    const a = engine.addPlayer({ id: "a", name: "Chaser", avatar: "bolt" });
    const b = engine.addPlayer({ id: "b", name: "Prey", avatar: "orb" });
    engine.start();
    a.isIt = true;
    b.isIt = false;
    engine.state.itId = a.id;
    b.hasShield = true;
    a.x = 400;
    a.y = 400;
    b.x = 410;
    b.y = 400;
    a.lastTaggedAt = -10;
    engine.tick(0.05);
    assert.equal(engine.state.itId, a.id);
    assert.equal(b.hasShield, false);

    a.lastTaggedAt = -10;
    engine.tick(0.05);
    assert.equal(engine.state.itId, b.id);
    assert.equal(b.isIt, true);
  });
});
