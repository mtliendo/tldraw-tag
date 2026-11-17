import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TagEngine } from "@inkt/shared";
import { rng } from "@inkt/shared";

describe("headless conference loop", () => {
  it("fills a projector-sized lobby with bots and finishes a round", () => {
    const engine = new TagEngine({
      roundLength: 18,
      shrinkInterval: 5,
      rand: rng(99),
    });
    engine.addPlayer({ name: "Advocate", avatar: "star" });
    engine.spawnBots(20);
    engine.start();
    const startW = engine.state.zone.w;
    for (let i = 0; i < 500 && engine.state.phase !== "ended"; i++) engine.tick(0.05);
    assert.equal(engine.state.phase, "ended");
    assert.ok(engine.state.zone.w < startW);
    assert.equal(engine.state.leaderboard.length, 21);
    assert.ok(engine.state.leaderboard[0].score >= 0);
  });
});
