import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TagEngine } from "./engine";
import {
  ARENA_H,
  ARENA_W,
  MAX_DISPLACE_PER_SEC,
  PLAYER_RADIUS,
  PLAYER_SEPARATION,
  POWER_RADIUS,
  WALL_THICKNESS,
  WALL_WIDTH,
  ART_INSET,
  artInsideZone,
  ZONE_INSET,
  ZONE_MIN_H,
  ZONE_MIN_W,
  minZoneSize,
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
    const min = minZoneSize(Object.keys(engine.state.players).length);
    assert.ok(engine.state.zone.w >= min.w - 1);
    assert.ok(engine.state.zone.h >= min.h - 1);
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

  it("keeps every player fully inside the shrinking zone every tick", () => {
    const engine = new TagEngine({
      roundLength: 14,
      shrinkInterval: 2.5,
      rand: rng(21),
    });
    engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.spawnBots(10);
    engine.start();
    for (let i = 0; i < 320 && engine.state.phase !== "ended"; i++) {
      engine.tick(0.05);
      const z = engine.state.zone;
      const players = Object.values(engine.state.players);
      for (const p of players) {
        assert.ok(p.x - PLAYER_RADIUS >= z.x - 0.05, `${p.name} left of zone at tick ${i}`);
        assert.ok(p.x + PLAYER_RADIUS <= z.x + z.w + 0.05, `${p.name} right of zone at tick ${i}`);
        assert.ok(p.y - PLAYER_RADIUS >= z.y - 0.05, `${p.name} above zone at tick ${i}`);
        assert.ok(p.y + PLAYER_RADIUS <= z.y + z.h + 0.05, `${p.name} below zone at tick ${i}`);
        assert.ok(artInsideZone(p.x, p.y, z), `${p.name} art left the zone at tick ${i}`);
      }
    }
    assert.equal(engine.state.phase, "ended");
  });

  it("keeps non-ghost blobs off paver walls after clamp and shrink", () => {
    const engine = new TagEngine({ roundLength: 20, shrinkInterval: 3, rand: rng(9) });
    engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.spawnBots(10);
    engine.start();
    engine.showcase();
    for (let i = 0; i < 80; i++) {
      engine.tick(0.05);
      for (const wall of Object.values(engine.state.walls)) {
        for (const p of Object.values(engine.state.players)) {
          if (p.ghostUntil > engine.state.now) continue;
          assert.equal(
            circleHitsAabb(p.x, p.y, PLAYER_RADIUS - 0.2, wall).hit,
            false,
            `${p.name} overlapped a wall at t=${engine.state.now.toFixed(2)}`,
          );
        }
      }
    }
  });

  it("soft-separates stacked players so blobs do not sit on top of each other", () => {
    const engine = new TagEngine({ roundLength: 20, shrinkInterval: 20, rand: rng(4) });
    const names = ["Mia", "Sketch", "Doodle", "Pixel", "Scribble", "Nib"];
    for (const name of names) engine.addPlayer({ name, avatar: "bolt" });
    engine.start();
    for (const p of Object.values(engine.state.players)) {
      p.x = 800;
      p.y = 820;
      engine.setInput(p.id, { x: 0, y: 0, usePower: false });
    }
    for (let i = 0; i < 12; i++) engine.tick(0.05);
    const players = Object.values(engine.state.players);
    const z = engine.state.zone;
    for (const p of players) {
      assert.ok(p.x - PLAYER_RADIUS >= z.x - 0.05);
      assert.ok(p.x + PLAYER_RADIUS <= z.x + z.w + 0.05);
      assert.ok(p.y - PLAYER_RADIUS >= z.y - 0.05);
      assert.ok(p.y + PLAYER_RADIUS <= z.y + z.h + 0.05);
    }
    for (let a = 0; a < players.length; a++) {
      for (let b = a + 1; b < players.length; b++) {
        assert.ok(
          dist(players[a].x, players[a].y, players[b].x, players[b].y) >= PLAYER_SEPARATION - 1.5,
          `${players[a].name} overlapped ${players[b].name}`,
        );
      }
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

  it("publishes only the current IT even if extra isIt flags are set", () => {
    const engine = new TagEngine({ roundLength: 20, rand: rng(2) });
    engine.addPlayer({ id: "a", name: "Ada", avatar: "bolt" });
    engine.addPlayer({ id: "b", name: "Bea", avatar: "orb" });
    engine.addPlayer({ id: "c", name: "Cyd", avatar: "fox" });
    engine.start();
    for (const p of Object.values(engine.state.players)) p.isIt = true;
    engine.state.itId = "b";
    const pub = engine.toPublic();
    assert.deepEqual(
      pub.players.filter((p) => p.isIt).map((p) => p.id),
      ["b"],
    );
    assert.equal(pub.itId, "b");
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

  it("spreads fleeing bots instead of parking them on a ring", () => {
    const engine = new TagEngine({ roundLength: 30, rand: rng(11) });
    const ada = engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.spawnBots(12);
    engine.start();
    ada.x = 800;
    ada.y = 450;
    ada.isIt = true;
    engine.state.itId = ada.id;
    for (const p of Object.values(engine.state.players)) {
      if (p.id === ada.id) continue;
      p.isIt = false;
      p.x = 800 + Math.cos(p.botPhase || 0) * 90;
      p.y = 450 + Math.sin(p.botPhase || 0) * 90;
    }
    for (let i = 0; i < 40; i++) engine.tick(0.05);
    const radii = Object.values(engine.state.players)
      .filter((p) => p.id !== ada.id)
      .map((p) => dist(p.x, p.y, ada.x, ada.y));
    const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
    const variance = radii.reduce((a, b) => a + (b - mean) ** 2, 0) / radii.length;
    assert.ok(Math.sqrt(variance) > 28, `bot radii too uniform (${Math.sqrt(variance).toFixed(1)})`);
    const speeds = Object.values(engine.state.players)
      .filter((p) => p.isBot)
      .map((p) => p.botSpeed);
    assert.ok(Math.max(...speeds) - Math.min(...speeds) > 0.15);
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

  it("scales the minimum zone with player count", () => {
    const two = minZoneSize(2);
    const fourteen = minZoneSize(14);
    const thirty = minZoneSize(30);
    assert.ok(fourteen.w > two.w + 40);
    assert.ok(thirty.w > fourteen.w + 40);
    assert.ok(Math.abs(fourteen.w / fourteen.h - 16 / 9) < 0.02);
    assert.ok(thirty.w <= ARENA_W);
    assert.ok(thirty.h <= ARENA_H);
  });

  it("plays again from the end screen with the same room and players", () => {
    const engine = new TagEngine({
      code: "AGAIN",
      roundLength: 8,
      shrinkInterval: 3,
      rand: rng(4),
    });
    engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.spawnBots(6);
    engine.start();
    const code = engine.state.code;
    const ids = Object.keys(engine.state.players).sort();
    for (let i = 0; i < 400 && engine.state.phase !== "ended"; i++) engine.tick(0.05);
    assert.equal(engine.state.phase, "ended");
    engine.start();
    assert.equal(engine.state.phase, "playing");
    assert.equal(engine.state.code, code);
    assert.deepEqual(Object.keys(engine.state.players).sort(), ids);
    assert.equal(engine.state.leaderboard.length, 0);
    assert.ok(engine.state.zone.w >= ARENA_W - 1);
  });

  it("passes IT to the nearest remaining player when IT leaves", () => {
    const engine = new TagEngine({ roundLength: 20, rand: rng(2) });
    const a = engine.addPlayer({ id: "a", name: "Ada", avatar: "bolt" });
    const b = engine.addPlayer({ id: "b", name: "Bea", avatar: "orb" });
    const c = engine.addPlayer({ id: "c", name: "Cyd", avatar: "fox" });
    engine.start();
    a.isIt = true;
    b.isIt = false;
    c.isIt = false;
    engine.state.itId = a.id;
    a.x = 400;
    a.y = 400;
    b.x = 460;
    b.y = 410;
    c.x = 900;
    c.y = 700;
    engine.removePlayer(a.id);
    assert.equal(engine.state.itId, b.id);
    assert.equal(b.isIt, true);
    assert.equal(c.isIt, false);
    assert.equal(engine.state.players[a.id], undefined);
  });

  it("keeps 30 players from overlapping or teleporting through a full shrink", () => {
    const engine = new TagEngine({
      roundLength: 16,
      shrinkInterval: 3,
      enabledPowers: ["speedster", "shield"],
      rand: rng(30),
    });
    for (let i = 0; i < 30; i++) {
      engine.addPlayer({ name: `P${i}`, avatar: "bolt", isBot: i > 0 });
    }
    engine.start();
    const dt = 0.05;
    const cap = MAX_DISPLACE_PER_SEC * dt + PLAYER_RADIUS;
    let maxStep = 0;
    let prev = Object.fromEntries(
      Object.values(engine.state.players).map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    for (let i = 0; i < 400 && engine.state.phase !== "ended"; i++) {
      engine.tick(dt);
      for (const p of Object.values(engine.state.players)) {
        const o = prev[p.id];
        if (!o) continue;
        const step = dist(p.x, p.y, o.x, o.y);
        if (step > maxStep) maxStep = step;
        assert.ok(step <= cap + 0.5, `${p.name} jumped ${step.toFixed(1)}px at tick ${i}`);
      }
      prev = Object.fromEntries(
        Object.values(engine.state.players).map((p) => [p.id, { x: p.x, y: p.y }]),
      );
    }
    assert.equal(engine.state.phase, "ended");
    const n = Object.keys(engine.state.players).length;
    assert.equal(n, 30);
    const min = minZoneSize(n);
    assert.ok(engine.state.zone.w >= min.w - 1);
    assert.ok(engine.state.zone.h >= min.h - 1);
    const players = Object.values(engine.state.players);
    for (let a = 0; a < players.length; a++) {
      if (players[a].ghostUntil > engine.state.now) continue;
      for (let b = a + 1; b < players.length; b++) {
        if (players[b].ghostUntil > engine.state.now) continue;
        assert.ok(
          dist(players[a].x, players[a].y, players[b].x, players[b].y) >= PLAYER_SEPARATION - 1.5,
          `${players[a].name} overlapped ${players[b].name} at the final zone`,
        );
      }
    }
    assert.ok(maxStep < cap, `max per-tick displacement ${maxStep.toFixed(1)} exceeded ${cap}`);
  });

  it("deals every critter before repeating, shared with bots", () => {
    const engine = new TagEngine({ rand: rng(7) });
    engine.spawnBots(10);
    engine.addPlayer({ name: "Ada" });
    engine.addPlayer({ name: "Bea" });
    engine.addPlayer({ name: "Cyd" });
    const dealt = Object.values(engine.state.players).map((p) => p.avatar);
    assert.equal(dealt.length, 13);
    assert.equal(new Set(dealt).size, 13);
    engine.addPlayer({ name: "Dot" });
    const again = Object.values(engine.state.players).map((p) => p.avatar);
    assert.equal(again.length, 14);
    assert.equal(new Set(again).size, 13);
  });

  it("ranks by time as IT, then fewer tags", () => {
    const engine = new TagEngine({ roundLength: 30, shrinkInterval: 30, rand: rng(5) });
    const ada = engine.addPlayer({ id: "a", name: "Ada", avatar: "bolt" });
    const toner = engine.addPlayer({ id: "t", name: "Toner", avatar: "orb" });
    const graphite = engine.addPlayer({ id: "g", name: "Graphite", avatar: "fox" });
    engine.start();
    for (const p of Object.values(engine.state.players)) {
      p.isIt = false;
      p.score = 0;
      p.tags = 0;
      p.vx = 0;
      p.vy = 0;
      engine.setInput(p.id, { x: 0, y: 0, usePower: false });
    }
    ada.isIt = true;
    engine.state.itId = ada.id;
    ada.x = 420;
    ada.y = 400;
    toner.x = 780;
    toner.y = 400;
    graphite.x = 420;
    graphite.y = 720;
    ada.lastTaggedAt = -10;
    for (let i = 0; i < 40; i++) engine.tick(0.05);
    toner.x = ada.x + 18;
    toner.y = ada.y;
    ada.lastTaggedAt = -10;
    engine.tick(0.05);
    assert.equal(engine.state.itId, toner.id);
    assert.equal(toner.tags, 1);
    toner.x = 780;
    toner.y = 400;
    for (let i = 0; i < 80; i++) engine.tick(0.05);
    engine.state.timeLeft = 0;
    engine.tick(0.05);
    assert.equal(engine.state.phase, "ended");
    const board = engine.state.leaderboard;
    assert.equal(board[0].name, "Graphite");
    const adaRow = board.find((row) => row.name === "Ada")!;
    const tonerRow = board.find((row) => row.name === "Toner")!;
    assert.ok(adaRow.score > 1.5 && adaRow.score < 2.6, `Ada IT time ${adaRow.score}`);
    assert.ok(tonerRow.score > adaRow.score, `Toner ${tonerRow.score} should exceed Ada ${adaRow.score}`);
    assert.equal(board[board.length - 1].name, "Toner");
  });

  it("stamps a stable tint on avatar repeats and publishes it on the leaderboard", () => {
    const engine = new TagEngine({ roundLength: 20, rand: rng(19) });
    for (let i = 0; i < 14; i++) engine.addPlayer({ name: `P${i}`, avatar: "bolt" });
    const seated = Object.values(engine.state.players);
    const counts = new Map<string, number>();
    for (const p of seated) {
      const n = counts.get(p.avatar) ?? 0;
      assert.equal(p.tint, n, `${p.name} ${p.avatar} tint ${p.tint} vs join index ${n}`);
      counts.set(p.avatar, n + 1);
    }
    assert.ok([...counts.values()].some((n) => n > 1), "expected a repeated critter");
    engine.start();
    engine.state.timeLeft = 0;
    engine.tick(0.05);
    const pub = engine.toPublic();
    for (const row of pub.leaderboard) {
      const p = engine.state.players[row.id];
      assert.equal(row.tint, p.tint);
      assert.equal(pub.players.find((x) => x.id === row.id)?.tint, p.tint);
    }
    const repeat = seated.find((p) => p.tint > 0);
    assert.ok(repeat);
    const boardIdx = pub.leaderboard.findIndex((row) => row.id === repeat!.id);
    assert.ok(boardIdx >= 0);
  });

  it("can pin a tinted repeat as IT", () => {
    const engine = new TagEngine({ roundLength: 20, rand: rng(21) });
    engine.spawnBots(18);
    engine.addPlayer({ id: "ada", name: "Ada" });
    engine.addPlayer({ id: "mia", name: "Mia" });
    engine.start();
    engine.pinTintedIt();
    const it = engine.state.players[engine.state.itId];
    assert.ok(it);
    assert.equal(it.id, "mia");
    assert.ok((it.tint ?? 0) > 0, `IT ${it.name} should be a tinted repeat, tint=${it.tint}`);
    assert.equal(it.isBot, false);
    assert.equal(it.isIt, true);
    assert.equal(Object.values(engine.state.players).filter((p) => p.isIt).length, 1);
  });

  it("breaks equal IT time with fewer tags first", () => {
    const engine = new TagEngine({ roundLength: 20, shrinkInterval: 30, rand: rng(8) });
    engine.addPlayer({ id: "a", name: "Ada", avatar: "bolt" });
    engine.addPlayer({ id: "b", name: "Bea", avatar: "orb" });
    engine.addPlayer({ id: "c", name: "Cyd", avatar: "fox" });
    engine.start();
    const ada = engine.state.players.a;
    const bea = engine.state.players.b;
    const cyd = engine.state.players.c;
    for (const p of [ada, bea, cyd]) {
      p.isIt = false;
      p.vx = 0;
      p.vy = 0;
      engine.setInput(p.id, { x: 0, y: 0, usePower: false });
    }
    cyd.isIt = true;
    engine.state.itId = cyd.id;
    ada.score = 3;
    ada.tags = 2;
    bea.score = 3;
    bea.tags = 0;
    cyd.score = 8;
    cyd.tags = 1;
    engine.state.timeLeft = 0;
    engine.tick(0.05);
    assert.equal(engine.state.leaderboard[0].name, "Bea");
    assert.equal(engine.state.leaderboard[1].name, "Ada");
    assert.equal(engine.state.leaderboard[2].name, "Cyd");
  });

  it("clamps frozen overlays inside the zone with extra inset", () => {
    const engine = new TagEngine({ roundLength: 20, shrinkInterval: 30, rand: rng(12) });
    engine.addPlayer({ name: "Ada", avatar: "bolt" });
    engine.spawnBots(6);
    engine.start();
    engine.showcase();
    const frozen = Object.values(engine.state.players).find((p) => p.frozenUntil > engine.state.now);
    assert.ok(frozen, "showcase should freeze someone");
    const z = engine.state.zone;
    frozen!.x = z.x + z.w / 2;
    frozen!.y = z.y;
    engine.tick(0.05);
    assert.ok(artInsideZone(frozen!.x, frozen!.y, z), `frozen y ${frozen!.y} vs ${z.y + ART_INSET.top}`);
    frozen!.x = z.x;
    engine.tick(0.05);
    assert.ok(artInsideZone(frozen!.x, frozen!.y, z));
  });

  it("pins idle, IT, shield, and frozen art inside every wall and the min zone", () => {
    const statesOf = (engine: TagEngine) => {
      const now = engine.state.now;
      const players = Object.values(engine.state.players);
      return {
        idle: players.filter((p) => !p.isIt && !p.hasShield && p.frozenUntil <= now),
        it: players.filter((p) => p.isIt),
        shield: players.filter((p) => p.hasShield),
        frozen: players.filter((p) => p.frozenUntil > now),
      };
    };
    const assertPinned = (engine: TagEngine, label: string) => {
      const z = engine.state.zone;
      const states = statesOf(engine);
      assert.ok(states.idle.length >= 1, `${label}: missing idle`);
      assert.ok(states.it.length >= 1, `${label}: missing IT`);
      assert.ok(states.shield.length >= 1, `${label}: missing shield`);
      assert.ok(states.frozen.length >= 1, `${label}: missing frozen`);
      const sides = { n: 0, e: 0, s: 0, w: 0 };
      for (const p of Object.values(engine.state.players)) {
        assert.ok(artInsideZone(p.x, p.y, z), `${label} ${p.name} art left the zone`);
        if (Math.abs(p.y - (z.y + ART_INSET.top)) < 1.2) sides.n += 1;
        if (Math.abs(p.y - (z.y + z.h - ART_INSET.bottom)) < 1.2) sides.s += 1;
        if (Math.abs(p.x - (z.x + ART_INSET.left)) < 1.2) sides.w += 1;
        if (Math.abs(p.x - (z.x + z.w - ART_INSET.right)) < 1.2) sides.e += 1;
      }
      assert.ok(sides.n >= 1 && sides.e >= 1 && sides.s >= 1 && sides.w >= 1, `${label} sides ${JSON.stringify(sides)}`);
    };

    const walls = new TagEngine({ roundLength: 40, shrinkInterval: 40, rand: rng(17) });
    walls.addPlayer({ name: "Ada", avatar: "bunny" });
    walls.spawnBots(15);
    walls.start();
    walls.pinArt();
    walls.tick(0.05);
    assertPinned(walls, "full zone");

    const tiny = new TagEngine({ roundLength: 40, shrinkInterval: 40, rand: rng(18) });
    tiny.addPlayer({ name: "Ada", avatar: "axolotl" });
    tiny.addPlayer({ name: "Nibbly", avatar: "bunny" });
    tiny.addPlayer({ name: "Pixel", avatar: "fox" });
    tiny.addPlayer({ name: "Vector", avatar: "penguin" });
    tiny.start();
    tiny.pinArt({ minZone: true });
    tiny.tick(0.05);
    const min = minZoneSize(4);
    assert.ok(Math.abs(tiny.state.zone.w - min.w) < 1);
    assertPinned(tiny, "min zone");

    const crowd = new TagEngine({ roundLength: 40, shrinkInterval: 40, rand: rng(20) });
    for (let i = 0; i < 20; i++) crowd.addPlayer({ name: `P${i}`, avatar: "bolt", isBot: i > 0 });
    crowd.start();
    crowd.pinArt({ minZone: true });
    crowd.tick(0.05);
    const crowdMin = minZoneSize(20);
    assert.ok(Math.abs(crowd.state.zone.w - crowdMin.w) < 1);
    const packed = Object.values(crowd.state.players);
    for (const p of packed) {
      assert.ok(artInsideZone(p.x, p.y, crowd.state.zone), `${p.name} art left the 20-player min zone`);
    }
    for (let a = 0; a < packed.length; a++) {
      for (let b = a + 1; b < packed.length; b++) {
        assert.ok(
          dist(packed[a].x, packed[a].y, packed[b].x, packed[b].y) >= PLAYER_SEPARATION - 1.5,
          `${packed[a].name} overlapped ${packed[b].name} in the 20-player min zone`,
        );
      }
    }
  });

  it("separates lobby spawns so critters do not overlap", () => {
    const engine = new TagEngine({ rand: rng(3) });
    const names = ["Ada", "Nibster", "Mia", "Sketch", "Graphite", "Stamp", "Raster", "Ink", "Paste", "Pixel"];
    for (const name of names) engine.addPlayer({ name, avatar: "bolt" });
    for (let i = 0; i < 6; i++) engine.tick(0.05);
    assert.equal(engine.state.phase, "lobby");
    const players = Object.values(engine.state.players);
    for (let a = 0; a < players.length; a++) {
      for (let b = a + 1; b < players.length; b++) {
        assert.ok(
          dist(players[a].x, players[a].y, players[b].x, players[b].y) >= PLAYER_SEPARATION - 1.5,
          `${players[a].name} overlapped ${players[b].name} in lobby`,
        );
      }
    }
  });
});
