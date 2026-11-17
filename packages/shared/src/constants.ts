export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ;
export const TICK_DT = 1 / TICK_HZ;

export const ARENA_W = 1600;
export const ARENA_H = 900;

/** Baseline the original art insets and HUD sizes were measured at. */
export const PLAYER_RADIUS_MEASURE = 36;

/** World-space hitbox radius. Every critter metric derives from this. */
export const PLAYER_RADIUS = 29;

export function scaleWithPlayer(n: number) {
  return Math.round((n * PLAYER_RADIUS) / PLAYER_RADIUS_MEASURE);
}

export const PLAYER_SPEED = 210;
export const SPEEDSTER_MULTIPLIER = 2.15;
export const DIAGONAL_LIMIT = 1;
export const PLAYER_TOKEN = PLAYER_RADIUS * 2;
export const PLAYER_LABEL_H = 26;
export const PLAYER_LABEL_W = 110;
export const STROKE = 1.5;
export const RING_PAD = scaleWithPlayer(8);

export const PLAYER_SEPARATION = PLAYER_RADIUS * 2;
export const TAG_DISTANCE = PLAYER_RADIUS * 2 + scaleWithPlayer(10);
export const MOBILE_BLOB_PX = scaleWithPlayer(44);
export const LANDSCAPE_BLOB_PX = Math.max(32, scaleWithPlayer(36));
export const TAG_COOLDOWN = 0.55;
export const PICKUP_DISTANCE = scaleWithPlayer(44);

export const DEFAULT_ROUND_LENGTH = 75;
export const MIN_ROUND_LENGTH = 15;
export const MAX_ROUND_LENGTH = 180;
export const DEFAULT_SHRINK_INTERVAL = 10;
export const ZONE_MIN_W = 320;
export const ZONE_MIN_H = 180;
export const ZONE_ASPECT = 16 / 9;
export const ZONE_PACK_FACTOR = 2.5;
export const ZONE_CELL_GAP = scaleWithPlayer(12);
export const ZONE_SHRINK_DURATION = 1.6;
export const ZONE_WARN_SECONDS = 2.5;
export const ZONE_INSET = PLAYER_RADIUS + 2;

/** World-px from body center to a painted critter edge, including SVG viewBox and drop-shadow. */
export type ArtInset = { left: number; right: number; top: number; bottom: number };

/**
 * Critter SVGs share viewBox `-8 -10 80 80` with the body at (40, 46). At R=36 the
 * <img> is 80 × (36/21) ≈ 137px, so the box extends ~68.6 left/right, 78.9 above,
 * and 58.3 below the hitbox center. Top is larger (ears, crown, IT flame). Margin
 * covers the 2px zone stroke, 2px drop-shadow, and CSS shield/self rings.
 * Values scale with PLAYER_RADIUS from the measured 72 / 82 / 64 box.
 */
export const ART_INSET: ArtInset = {
  left: scaleWithPlayer(72),
  right: scaleWithPlayer(72),
  top: scaleWithPlayer(82),
  bottom: scaleWithPlayer(64),
};

export function clampToZoneArt(
  x: number,
  y: number,
  zone: { x: number; y: number; w: number; h: number },
  inset: ArtInset = ART_INSET,
) {
  const x0 = zone.x + inset.left;
  const x1 = zone.x + zone.w - inset.right;
  const y0 = zone.y + inset.top;
  const y1 = zone.y + zone.h - inset.bottom;
  return {
    x: x1 < x0 ? zone.x + zone.w / 2 : Math.min(Math.max(x, x0), x1),
    y: y1 < y0 ? zone.y + zone.h / 2 : Math.min(Math.max(y, y0), y1),
  };
}

export function artInsideZone(
  x: number,
  y: number,
  zone: { x: number; y: number; w: number; h: number },
  inset: ArtInset = ART_INSET,
  eps = 0.51,
) {
  return (
    x - inset.left >= zone.x - eps &&
    x + inset.right <= zone.x + zone.w + eps &&
    y - inset.top >= zone.y - eps &&
    y + inset.bottom <= zone.y + zone.h + eps
  );
}

export const SEPARATION_ITERS = 8;
export const SEPARATION_STIFFNESS = 0.45;
export const MAX_DISPLACE_PER_SEC = 720;
export const RECONNECT_GRACE_S = 10;

export const POWER_SPAWN_MIN = 2.2;
export const POWER_SPAWN_MAX = 4.8;
export const POWER_PULSE_WARN = 1;
export const POWER_RADIUS = scaleWithPlayer(28);
export const POWER_TOKEN = POWER_RADIUS * 2;
export const POWER_GEM = scaleWithPlayer(44);
export const POWER_PULSE = scaleWithPlayer(64);
export const POWER_MAX_ON_BOARD = 10;

export const WALL_WIDTH = 140;
export const WALL_THICKNESS = 26;
export const WALL_LIFETIME = 5;
export const WALL_PLACE_OFFSET = 64;

export const GHOST_DURATION = 2;
export const SPEED_DURATION = 2;
export const DECOY_DURATION = 4;
export const FREEZE_DURATION = 1.5;
export const FREEZE_RANGE = 120;
export const SHIELD_DURATION = 12;

export const BOT_THINK_INTERVAL = 0.28;
export const MAX_PLAYERS = 48;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 4;

export const INTERP_DELAY_MS = 80;

/** Smallest 16:9 zone that can hold `n` blobs at comfortable spacing. */
export function minZoneSize(playerCount: number): { w: number; h: number } {
  const n = Math.max(1, playerCount);
  const cell = PLAYER_SEPARATION + ZONE_CELL_GAP;
  const interior = n * cell * cell * ZONE_PACK_FACTOR;
  const padX = ART_INSET.left + ART_INSET.right;
  const padY = ART_INSET.top + ART_INSET.bottom;
  const fits = (w: number) => {
    const h = w / ZONE_ASPECT;
    return Math.max(0, w - padX) * Math.max(0, h - padY) >= interior && h >= ZONE_MIN_H;
  };
  if (!fits(ARENA_W)) return { w: ARENA_W, h: ARENA_H };
  let lo = ZONE_MIN_W;
  let hi = ARENA_W;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  const w = Math.min(ARENA_W, Math.max(ZONE_MIN_W, hi));
  const h = Math.min(ARENA_H, Math.max(ZONE_MIN_H, w / ZONE_ASPECT));
  return { w, h };
}
