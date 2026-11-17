import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ARENA_H, ARENA_W, LANDSCAPE_BLOB_PX, MOBILE_BLOB_PX, PLAYER_TOKEN } from "@inkt/shared";
import { landscapeFollowPad, portraitFollowPad } from "./phoneLayout";
import {
  HINT_MS,
  LANDSCAPE_MAX_VISIBLE_ARENA,
  PORTRAIT_MAX_VISIBLE_ARENA,
  STICK_TRAVEL,
  ZOOM_IN_MAX,
  clampZoom,
  followBounds,
  followCamera,
  idleGesture,
  moveHintVisible,
  reduceGesture,
  stickFromPointer,
  visibleArenaWidth,
  zoomLimits,
  type GestureState,
} from "./playGestures";

const portrait = zoomLimits({
  viewportW: 390,
  viewportH: 700,
  landscape: false,
  blobPx: MOBILE_BLOB_PX,
});

const landscape = zoomLimits({
  viewportW: 844,
  viewportH: 390,
  landscape: true,
  blobPx: LANDSCAPE_BLOB_PX,
});

function run(events: Parameters<typeof reduceGesture>[1][], limits = portrait, start?: GestureState) {
  let state = start ?? idleGesture(limits.base);
  for (const event of events) state = reduceGesture(state, event, { now: 1_000, limits });
  return state;
}

describe("play gestures", () => {
  it("clamps follow zoom so the whole arena never fits", () => {
    assert.equal(portrait.minZoom, 390 / (ARENA_W * PORTRAIT_MAX_VISIBLE_ARENA));
    assert.equal(landscape.minZoom, 844 / (ARENA_W * LANDSCAPE_MAX_VISIBLE_ARENA));
    assert.ok(portrait.maxZoom / portrait.base - ZOOM_IN_MAX < 1e-9);
    assert.ok(landscape.base > landscape.minZoom);
    assert.ok(visibleArenaWidth(390, portrait.minZoom) <= PORTRAIT_MAX_VISIBLE_ARENA + 1e-9);
    assert.ok(visibleArenaWidth(844, landscape.minZoom) <= LANDSCAPE_MAX_VISIBLE_ARENA + 1e-9);
    assert.ok(portrait.base >= MOBILE_BLOB_PX / PLAYER_TOKEN - 1e-9);
    assert.ok(clampZoom(0, portrait) === portrait.minZoom);
    assert.ok(clampZoom(99, portrait) === portrait.maxZoom);
  });

  it("zoom-out clamp widens the visible arena vs the default", () => {
    const portDefault = visibleArenaWidth(390, portrait.base);
    const portOut = visibleArenaWidth(390, portrait.minZoom);
    assert.ok(portOut > portDefault + 0.08, `portrait ${portOut} vs ${portDefault}`);
    assert.ok(Math.abs(portOut - PORTRAIT_MAX_VISIBLE_ARENA) < 1e-9);

    const landDefault = visibleArenaWidth(844, landscape.base);
    const landOut = visibleArenaWidth(844, landscape.minZoom);
    assert.ok(landOut > landDefault + 0.08, `landscape ${landOut} vs ${landDefault}`);
    assert.ok(Math.abs(landOut - LANDSCAPE_MAX_VISIBLE_ARENA) < 1e-9);
  });

  it("spawns a stick at the first board finger and follows it", () => {
    const state = run([
      { type: "down", id: 1, x: 200, y: 400 },
      { type: "move", id: 1, x: 200 + STICK_TRAVEL, y: 400 },
    ]);
    assert.equal(state.mode, "stick");
    assert.deepEqual(state.stick?.origin, { x: 200, y: 400 });
    assert.ok(Math.abs(state.input.x - 1) < 1e-9);
    assert.ok(Math.abs(state.input.y) < 1e-9);
    assert.equal(state.moved, true);
  });

  it("clamps the knob to the stick travel", () => {
    const aimed = stickFromPointer({ x: 0, y: 0 }, { x: 400, y: 0 });
    assert.ok(Math.abs(aimed.knob.x - STICK_TRAVEL) < 1e-9);
    assert.ok(Math.abs(aimed.input.x - 1) < 1e-9);
  });

  it("fades the stick on release and zeros input", () => {
    const state = run([
      { type: "down", id: 1, x: 120, y: 180 },
      { type: "move", id: 1, x: 150, y: 210 },
      { type: "up", id: 1 },
    ]);
    assert.equal(state.mode, "idle");
    assert.equal(state.stick, null);
    assert.ok(state.fading);
    assert.equal(state.fadeUntil, 1_000 + 180);
    assert.deepEqual(state.input, { x: 0, y: 0 });
  });

  it("cancels the stick and pinches when a second board finger lands", () => {
    const start = run([
      { type: "down", id: 1, x: 200, y: 300 },
      { type: "move", id: 1, x: 230, y: 300 },
    ]);
    assert.equal(start.mode, "stick");
    const pinched = run([{ type: "down", id: 2, x: 280, y: 300 }], portrait, start);
    assert.equal(pinched.mode, "pinch");
    assert.equal(pinched.stick, null);
    assert.deepEqual(pinched.input, { x: 0, y: 0 });
    const zoomedIn = run([{ type: "move", id: 2, x: 360, y: 300 }], portrait, pinched);
    assert.ok(zoomedIn.zoom > pinched.zoom);
    assert.ok(zoomedIn.zoom <= portrait.maxZoom + 1e-9);
  });

  it("clamps pinch zoom-out to the arena visibility cap", () => {
    const start = run([
      { type: "down", id: 1, x: 200, y: 200 },
      { type: "down", id: 2, x: 280, y: 200 },
    ]);
    const out = run([{ type: "move", id: 2, x: 201, y: 200 }], portrait, start);
    assert.ok(Math.abs(out.zoom - portrait.minZoom) < 1e-6);
    assert.ok(visibleArenaWidth(390, out.zoom) <= PORTRAIT_MAX_VISIBLE_ARENA + 1e-9);
  });

  it("does not resurrect a stick from the leftover pinch finger", () => {
    const state = run([
      { type: "down", id: 1, x: 100, y: 100 },
      { type: "down", id: 2, x: 180, y: 100 },
      { type: "up", id: 2 },
      { type: "move", id: 1, x: 140, y: 140 },
    ]);
    assert.equal(state.mode, "idle");
    assert.equal(state.stick, null);
    assert.deepEqual(state.input, { x: 0, y: 0 });
  });

  it("ignores a stray pointer that never started on the board", () => {
    const state = run([{ type: "move", id: 9, x: 10, y: 10 }]);
    assert.equal(state.mode, "idle");
  });

  it("hides the move hint after the first touch or 4s", () => {
    assert.equal(moveHintVisible(false, 0), true);
    assert.equal(moveHintVisible(true, 0), false);
    assert.equal(moveHintVisible(false, HINT_MS), false);
  });

  it("uses the zone while zoomed in and the arena when the view is larger than the zone", () => {
    const zone = { x: 200, y: 100, w: 800, h: 500 };
    const tight = followBounds(zone, 390, 500, 2);
    assert.deepEqual(tight, zone);
    const wide = followBounds(zone, 390, 733, 0.5);
    assert.deepEqual(wide, { x: 0, y: 0, w: ARENA_W, h: ARENA_H });
  });

  it("lets a bottom-right wall player sit clear of the power button", () => {
    const pad = portraitFollowPad(390, 844);
    const zoom = 0.814;
    const vp = { w: 390, h: 733 };
    const bounds = { x: 0, y: 0, w: ARENA_W, h: ARENA_H };
    const player = { x: ARENA_W - PLAYER_TOKEN / 2, y: ARENA_H - PLAYER_TOKEN / 2 };
    const cam = followCamera({
      viewportW: vp.w,
      viewportH: vp.h,
      zoom,
      player,
      bounds,
      pad,
    });
    const screenX = (player.x - cam.left) * zoom;
    const screenY = (player.y - cam.top) * zoom;
    const blob = (PLAYER_TOKEN / 2) * zoom;
    assert.ok(screenY + blob <= vp.h - pad.bottom + 1, `bottom ${screenY + blob} vs ${vp.h - pad.bottom}`);
    assert.ok(screenX + blob <= vp.w - pad.right + 1, `right ${screenX + blob} vs ${vp.w - pad.right}`);
    assert.ok(cam.top > 0, "must pan past the board edge");
  });

  it("lets a landscape corner player sit left of the power button", () => {
    const pad = landscapeFollowPad(844, 390);
    const zoom = 0.91;
    const vp = { w: 844, h: 390 };
    const player = { x: ARENA_W - PLAYER_TOKEN / 2, y: ARENA_H - PLAYER_TOKEN / 2 };
    const cam = followCamera({
      viewportW: vp.w,
      viewportH: vp.h,
      zoom,
      player,
      bounds: { x: 0, y: 0, w: ARENA_W, h: ARENA_H },
      pad,
    });
    const screenX = (player.x - cam.left) * zoom;
    const blob = (PLAYER_TOKEN / 2) * zoom;
    assert.ok(screenX + blob <= vp.w - pad.right + 1, `right ${screenX + blob} vs ${vp.w - pad.right}`);
  });

  it("clamps follow to the arena and centers when the board is shorter than the view", () => {
    const bounds = { x: 0, y: 0, w: ARENA_W, h: ARENA_H };
    const follow = followCamera({
      viewportW: 390,
      viewportH: 500,
      zoom: 1,
      player: { x: 200, y: 80 },
      bounds,
    });
    assert.ok(follow.top >= 0);
    assert.ok(follow.top + 500 <= ARENA_H + 1e-6);
    assert.ok(Math.abs(follow.top - (80 - 250)) > 10);

    const wide = followCamera({
      viewportW: 390,
      viewportH: 1100,
      zoom: 1,
      player: { x: 100, y: 0 },
      bounds,
    });
    assert.equal(wide.centered, true);
    assert.ok(Math.abs(wide.top - (ARENA_H - 1100) / 2) < 1e-6);
  });

  it("resets zoom to the default on rotate", () => {
    const zoomed = { ...idleGesture(portrait.maxZoom), zoom: portrait.maxZoom };
    const reset = reduceGesture(zoomed, { type: "reset" }, { now: 0, limits: landscape });
    assert.equal(reset.zoom, landscape.base);
    assert.equal(reset.mode, "idle");
  });
});
