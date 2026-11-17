import { ARENA_H, ARENA_W, PLAYER_TOKEN } from "@inkt/shared";

export const STICK_SIZE = 108;
export const STICK_KNOB = 46;
export const STICK_TRAVEL = STICK_SIZE / 2 - 18;
export const ZOOM_IN_MAX = 1.6;
export const PORTRAIT_MAX_VISIBLE_ARENA = 0.6;
export const LANDSCAPE_MAX_VISIBLE_ARENA = 0.75;
export const JOY_FADE_MS = 180;
export const HINT_MS = 4000;

export type FollowPad = { left: number; right: number; top: number; bottom: number };
export type Box = { x: number; y: number; w: number; h: number };

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
  // Default stays tighter than the zoom-out cap so pinch-out actually widens the view.
  const base = Math.max(blobZoom, minZoom * 1.3);
  const maxZoom = base * ZOOM_IN_MAX;
  return { base, minZoom, maxZoom: Math.max(maxZoom, minZoom) };
}

export function moveHintVisible(moved: boolean, elapsedMs: number) {
  return !moved && elapsedMs < HINT_MS;
}

export function followBounds(zone: Box, viewportW: number, viewportH: number, zoom: number): Box {
  const viewW = viewportW / zoom;
  const viewH = viewportH / zoom;
  if (viewW > zone.w || viewH > zone.h) {
    return { x: 0, y: 0, w: ARENA_W, h: ARENA_H };
  }
  return { x: zone.x, y: zone.y, w: zone.w, h: zone.h };
}

/** Keep the follow camera on the playfield. Center when the board is smaller than the view. */
export function followCamera(opts: {
  viewportW: number;
  viewportH: number;
  zoom: number;
  player: { x: number; y: number } | null;
  bounds: Box;
  pad?: FollowPad;
}) {
  const viewW = opts.viewportW / opts.zoom;
  const viewH = opts.viewportH / opts.zoom;
  const pad = opts.pad ?? { left: 0, right: 0, top: 0, bottom: 0 };
  const innerW = Math.max(1, opts.viewportW - pad.left - pad.right);
  const innerH = Math.max(1, opts.viewportH - pad.top - pad.bottom);
  const focusX = pad.left + innerW / 2;
  const focusY = pad.top + innerH / 2;
  const originX = opts.player?.x ?? opts.bounds.x + opts.bounds.w / 2;
  const originY = opts.player?.y ?? opts.bounds.y + opts.bounds.h / 2;
  let left = originX - focusX / opts.zoom;
  let top = originY - focusY / opts.zoom;
  const maxLeft = opts.bounds.x + Math.max(0, opts.bounds.w - viewW);
  const maxTop = opts.bounds.y + Math.max(0, opts.bounds.h - viewH);
  left = Math.min(Math.max(left, opts.bounds.x), maxLeft);
  top = Math.min(Math.max(top, opts.bounds.y), maxTop);
  if (viewW >= opts.bounds.w) left = opts.bounds.x + (opts.bounds.w - viewW) / 2;
  if (viewH >= opts.bounds.h) top = opts.bounds.y + (opts.bounds.h - viewH) / 2;
  return { left, top, zoom: opts.zoom, centered: viewW >= opts.bounds.w || viewH >= opts.bounds.h };
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
  ctx: { now: number; limits: ZoomLimits; startZoom?: number },
): GestureState {
  if (event.type === "reset") {
    return idleGesture(ctx.startZoom ?? ctx.limits.base);
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
