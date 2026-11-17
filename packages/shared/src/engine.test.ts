import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TagEngine } from "./engine";
import {
  ARENA_H,
  ARENA_W,
  PLAYER_RADIUS,
  POWER_RADIUS,
  WALL_THICKNESS,
  WALL_WIDTH,
  ZONE_INSET,
  ZONE_MIN_H,
  ZONE_MIN_W,
} from "./constants";
import { circleHitsAabb, dist, rng } from "./ids";

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
      assert.ok(p.x >= engine.state.zone.x + ZONE_INSET - 0.5);
      assert.ok(p.x <= engine.state.zone.x + engine.state.zone.w - ZONE_INSET + 0.5);
      assert.ok(p.y >= engine.state.zone.y + ZONE_INSET - 0.5);
      assert.ok(p.y <= engine.state.zone.y + engine.state.zone.h - ZONE_INSET + 0.5);
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

  it("showcase pins gems, a wall, a freeze, and a held power", () => {
    const engine = new TagEngine({ roundLength: 30, rand: rng(11) });
    engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.spawnBots(8);
    engine.start();
    engine.showcase();
    const pub = engine.toPublic();
    assert.ok(pub.powerUps.length >= 3);
    assert.ok(pub.walls.length >= 1);
    assert.ok(pub.pulses.length >= 1);
    assert.ok(pub.players.some((p) => p.frozen));
    assert.ok(pub.players.some((p) => p.powerId === "paver"));
    assert.ok(pub.shrinkIn > 0 && pub.shrinkIn <= 2);
  });

  it("lets bots chase and flee instead of sitting still after showcase", () => {
    const engine = new TagEngine({ roundLength: 30, rand: rng(19) });
    engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.spawnBots(8);
    engine.start();
    const before = Object.fromEntries(
      Object.values(engine.state.players).map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    engine.showcase();
    for (let i = 0; i < 24; i++) engine.tick(0.05);
    const moved = Object.values(engine.state.players).filter((p) => {
      const prev = before[p.id];
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      return dx * dx + dy * dy > 64;
    });
    assert.ok(moved.length >= 5);
  });

  it("does not spawn power-ups on players", () => {
    const engine = new TagEngine({ roundLength: 20, shrinkInterval: 20, rand: rng(77) });
    engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.addPlayer({ name: "Bea", avatar: "orb" });
    engine.start();
    const [a, b] = Object.values(engine.state.players);
    a.x = 420;
    a.y = 380;
    b.x = 820;
    b.y = 540;
    engine.state.nextPowerAt = 0;
    let spawned = 0;
    for (let i = 0; i < 80; i++) {
      engine.tick(0.05);
      const loot = [...Object.values(engine.state.powerUps), ...Object.values(engine.state.pulses)];
      spawned += loot.length;
      for (const item of loot) {
        for (const p of Object.values(engine.state.players)) {
          assert.ok(
            dist(p.x, p.y, item.x, item.y) >= PLAYER_RADIUS + POWER_RADIUS,
            "loot overlapped a player",
          );
        }
      }
    }
    assert.ok(spawned > 0);
  });

  it("blocks players on paver walls, slides along them, and lets ghosts through", () => {
    const engine = new TagEngine({ roundLength: 20, rand: rng(5) });
    const a = engine.addPlayer({ id: "a", name: "Ada", avatar: "bolt" });
    engine.addPlayer({ id: "b", name: "Bea", avatar: "orb" });
    engine.start();
    engine.state.walls.w1 = {
      id: "w1",
      x: 500,
      y: 300,
      w: WALL_THICKNESS,
      h: WALL_WIDTH,
      expiresAt: 999,
    };
    a.x = 430;
    a.y = 370;
    a.ghostUntil = 0;
    engine.setInput(a.id, { x: 1, y: -0.4, usePower: false });
    const startY = a.y;
    for (let i = 0; i < 16; i++) engine.tick(0.05);
    assert.equal(circleHitsAabb(a.x, a.y, PLAYER_RADIUS - 0.05, engine.state.walls.w1).hit, false);
    assert.ok(a.x + PLAYER_RADIUS <= 500 + 1.5);
    assert.ok(a.y < startY - 8, "should slide along the wall");

    a.ghostUntil = engine.state.now + 8;
    engine.setInput(a.id, { x: 1, y: 0, usePower: false });
    for (let i = 0; i < 30; i++) engine.tick(0.05);
    assert.ok(a.x > 500 + WALL_THICKNESS, "ghost should pass through");
  });

  it("pushes a player out if they spawn inside a wall", () => {
    const engine = new TagEngine({ roundLength: 12, rand: rng(8) });
    const a = engine.addPlayer({ id: "a", name: "Ada", avatar: "bolt" });
    engine.addPlayer({ id: "b", name: "Bea", avatar: "orb" });
    engine.start();
    engine.state.walls.w1 = {
      id: "w1",
      x: 600,
      y: 400,
      w: WALL_WIDTH,
      h: WALL_THICKNESS,
      expiresAt: 999,
    };
    a.x = 650;
    a.y = 413;
    engine.setInput(a.id, { x: 0, y: 0, usePower: false });
    engine.tick(0.05);
    assert.equal(circleHitsAabb(a.x, a.y, PLAYER_RADIUS - 0.05, engine.state.walls.w1).hit, false);
  });

  it("never places a paver wall on a player", () => {
    const engine = new TagEngine({ roundLength: 16, rand: rng(13) });
    const a = engine.addPlayer({ id: "a", name: "Ada", avatar: "bolt" });
    const b = engine.addPlayer({ id: "b", name: "Bea", avatar: "orb" });
    engine.start();
    a.x = 500;
    a.y = 420;
    a.facingX = 1;
    a.facingY = 0;
    b.x = 564;
    b.y = 420;
    a.powerId = "paver";
    a.charges = 3;
    engine.setInput(a.id, { x: 0, y: 0, usePower: true });
    engine.tick(0.05);
    for (const wall of Object.values(engine.state.walls)) {
      for (const p of Object.values(engine.state.players)) {
        assert.equal(
          circleHitsAabb(p.x, p.y, PLAYER_RADIUS, wall).hit,
          false,
          `${p.name} overlapped a newly placed wall`,
        );
      }
    }
  });
});
