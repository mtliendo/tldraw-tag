import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ART_INSET,
  LANDSCAPE_BLOB_PX,
  MOBILE_BLOB_PX,
  PICKUP_DISTANCE,
  PLAYER_RADIUS,
  PLAYER_RADIUS_MEASURE,
  PLAYER_SEPARATION,
  PLAYER_TOKEN,
  POWER_PULSE,
  POWER_RADIUS,
  POWER_TOKEN,
  RING_PAD,
  TAG_DISTANCE,
  IT_ORANGE,
  ZONE_CELL_GAP,
  minZoneSize,
  scaleWithPlayer,
} from "./constants";

describe("player scale", () => {
  it("derives every critter metric from PLAYER_RADIUS", () => {
    assert.equal(IT_ORANGE, "#E8542F");
    assert.equal(PLAYER_RADIUS, 29);
    assert.equal(PLAYER_TOKEN, PLAYER_RADIUS * 2);
    assert.equal(PLAYER_SEPARATION, PLAYER_RADIUS * 2);
    assert.equal(PLAYER_TOKEN, 58);
    assert.equal(ART_INSET.left, scaleWithPlayer(72));
    assert.equal(ART_INSET.right, scaleWithPlayer(72));
    assert.equal(ART_INSET.top, scaleWithPlayer(82));
    assert.equal(ART_INSET.bottom, scaleWithPlayer(64));
    assert.equal(ART_INSET.left, 58);
    assert.equal(ART_INSET.top, 66);
    assert.equal(ART_INSET.bottom, 52);
    assert.equal(TAG_DISTANCE, PLAYER_RADIUS * 2 + scaleWithPlayer(10));
    assert.equal(PICKUP_DISTANCE, scaleWithPlayer(44));
    assert.equal(MOBILE_BLOB_PX, scaleWithPlayer(44));
    assert.equal(POWER_RADIUS, scaleWithPlayer(28));
    assert.equal(POWER_TOKEN, POWER_RADIUS * 2);
    assert.equal(POWER_PULSE, scaleWithPlayer(64));
    assert.equal(RING_PAD, scaleWithPlayer(8));
    assert.equal(ZONE_CELL_GAP, scaleWithPlayer(12));
    assert.equal(scaleWithPlayer(PLAYER_RADIUS_MEASURE), PLAYER_RADIUS);
  });

  it("keeps landscape critters readable", () => {
    assert.ok(LANDSCAPE_BLOB_PX >= 32);
    assert.ok(MOBILE_BLOB_PX >= 32);
  });

  it("fits 20 players in the min zone without overlapping hitboxes", () => {
    const zone = minZoneSize(20);
    const padX = ART_INSET.left + ART_INSET.right;
    const padY = ART_INSET.top + ART_INSET.bottom;
    const cols = 5;
    const rows = 4;
    const cellW = (zone.w - padX) / cols;
    const cellH = (zone.h - padY) / rows;
    assert.ok(cellW >= PLAYER_SEPARATION - 0.5, `min zone cellW ${cellW} vs ${PLAYER_SEPARATION}`);
    assert.ok(cellH >= PLAYER_SEPARATION - 0.5, `min zone cellH ${cellH} vs ${PLAYER_SEPARATION}`);
    assert.ok(zone.w < 1600);
    assert.ok(zone.h < 900);
  });
});
