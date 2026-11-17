import { ARENA_H, ARENA_W, PLAYER_TOKEN } from "@inkt/shared";

export const STICK_SIZE = 108;
export const STICK_KNOB = 46;
export const STICK_TRAVEL = STICK_SIZE / 2 - 18;
export const ZOOM_IN_MAX = 1.6;
export const PORTRAIT_MAX_VISIBLE_ARENA = 0.6;
export const LANDSCAPE_MAX_VISIBLE_ARENA = 0.75;
export const JOY_FADE_MS = 180;

export type Vec = { x: number; y: number };

export type ZoomLimits = {
  base: number;
  minZoom: number;
  maxZoom: number;
};

export type GestureMode = "idle" | "stick" | "pinch";

export type StickState = {
  pointerId: number;
  origin: Vec;
  knob: Vec;
};

export type GestureState = {
  mode: GestureMode;
  pointers: Record<number, Vec>;
  stick: StickState | null;
  fading: StickState | null;
  fadeUntil: number;
  pinchIds: [number, number] | null;
  pinchStartDist: number;
  pinchStartZoom: number;
  zoom: number;
  input: Vec;
  moved: boolean;
};

export type GestureEvent =
  | { type: "down"; id: number; x: number; y: number }
  | { type: "move"; id: number; x: number; y: number }
  | { type: "up"; id: number }
  | { type: "cancel"; id: number }
  | { type: "reset" };

export function defaultFollowZoom(blobPx: number) {
  return Math.max(32, blobPx) / PLAYER_TOKEN;
}

/** Least zoom (most zoomed out) that still hides the rest of the arena. */
export function minFollowZoom(viewportW: number, landscape: boolean) {
  const frac = landscape ? LANDSCAPE_MAX_VISIBLE_ARENA : PORTRAIT_MAX_VISIBLE_ARENA;
  return viewportW / (ARENA_W * frac);
}

export function zoomLimits(opts: {
  viewportW: number;
  viewportH: number;
  landscape: boolean;
  blobPx: number;
}): ZoomLimits {
  const blobZoom = defaultFollowZoom(opts.blobPx);
  const minZoom = minFollowZoom(opts.viewportW, opts.landscape);
  const coverArena = Math.max(opts.viewportW / ARENA_W, opts.viewportH / ARENA_H);
  const base = Math.max(blobZoom, minZoom, coverArena);
  const maxZoom = base * ZOOM_IN_MAX;
  return { base, minZoom, maxZoom: Math.max(maxZoom, minZoom) };
}

export function clampZoom(zoom: number, limits: ZoomLimits) {
  return Math.min(limits.maxZoom, Math.max(limits.minZoom, zoom));
}

export function visibleArenaWidth(viewportW: number, zoom: number) {
  return viewportW / Math.max(0.0001, zoom) / ARENA_W;
}

export function idleGesture(zoom: number): GestureState {
  return {
    mode: "idle",
    pointers: {},
    stick: null,
    fading: null,
    fadeUntil: 0,
    pinchIds: null,
    pinchStartDist: 0,
    pinchStartZoom: zoom,
    zoom,
    input: { x: 0, y: 0 },
    moved: false,
  };
}

function dist(a: Vec, b: Vec) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function stickFromPointer(origin: Vec, point: Vec): { knob: Vec; input: Vec } {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const mag = Math.hypot(dx, dy);
  const scale = mag > STICK_TRAVEL ? STICK_TRAVEL / mag : 1;
  const knob = { x: dx * scale, y: dy * scale };
  return {
    knob,
    input: { x: knob.x / STICK_TRAVEL, y: knob.y / STICK_TRAVEL },
  };
}

function pointerList(pointers: Record<number, Vec>) {
  return Object.keys(pointers).map(Number);
}

export function reduceGesture(
  state: GestureState,
  event: GestureEvent,
  ctx: { now: number; limits: ZoomLimits },
): GestureState {
  if (event.type === "reset") {
    return idleGesture(ctx.limits.base);
  }

  const pointers = { ...state.pointers };
  let next: GestureState = { ...state, pointers };

  const clearStick = (fade: boolean): GestureState => {
    const fading = fade && next.stick ? { ...next.stick } : null;
    return {
      ...next,
      mode: "idle",
      stick: null,
      fading,
      fadeUntil: fading ? ctx.now + JOY_FADE_MS : 0,
      input: { x: 0, y: 0 },
    };
  };

  if (event.type === "down") {
    pointers[event.id] = { x: event.x, y: event.y };
    next = { ...next, pointers, fading: null, fadeUntil: 0 };
    const ids = pointerList(pointers);
    if (ids.length >= 2 && next.mode !== "pinch") {
      const [a, b] = ids;
      const pa = pointers[a];
      const pb = pointers[b];
      return {
        ...clearStick(false),
        pointers,
        mode: "pinch",
        pinchIds: [a, b],
        pinchStartDist: Math.max(1, dist(pa, pb)),
        pinchStartZoom: next.zoom,
        moved: true,
      };
    }
    if (ids.length === 1 && next.mode !== "pinch") {
      const origin = { x: event.x, y: event.y };
      const aimed = stickFromPointer(origin, origin);
      return {
        ...next,
        mode: "stick",
        stick: { pointerId: event.id, origin, knob: aimed.knob },
        fading: null,
        pinchIds: null,
        input: aimed.input,
        moved: true,
      };
    }
    return next;
  }

  if (event.type === "move") {
    if (!(event.id in pointers)) return state;
    pointers[event.id] = { x: event.x, y: event.y };
    next = { ...next, pointers };
    if (next.mode === "stick" && next.stick && event.id === next.stick.pointerId) {
      const aimed = stickFromPointer(next.stick.origin, pointers[event.id]);
      return {
        ...next,
        stick: { ...next.stick, knob: aimed.knob },
        input: aimed.input,
        moved: true,
      };
    }
    if (next.mode === "pinch" && next.pinchIds) {
      const [a, b] = next.pinchIds;
      const pa = pointers[a];
      const pb = pointers[b];
      if (!pa || !pb) return next;
      const ratio = dist(pa, pb) / next.pinchStartDist;
      return {
        ...next,
        zoom: clampZoom(next.pinchStartZoom * ratio, ctx.limits),
      };
    }
    return next;
  }

  if (event.type === "up" || event.type === "cancel") {
    if (!(event.id in pointers)) return state;
    delete pointers[event.id];
    next = { ...next, pointers };
    if (next.mode === "stick" && next.stick?.pointerId === event.id) {
      return clearStick(true);
    }
    if (next.mode === "pinch") {
      const ids = pointerList(pointers);
      if (ids.length < 2) {
        return {
          ...next,
          mode: "idle",
          stick: null,
          pinchIds: null,
          input: { x: 0, y: 0 },
        };
      }
    }
    return next;
  }

  return state;
}
