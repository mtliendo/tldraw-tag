export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ;
export const TICK_DT = 1 / TICK_HZ;

export const ARENA_W = 1600;
export const ARENA_H = 900;

export const PLAYER_RADIUS = 36;
export const PLAYER_SPEED = 210;
export const SPEEDSTER_MULTIPLIER = 2.15;
export const DIAGONAL_LIMIT = 1;
export const PLAYER_TOKEN = 80;
export const PLAYER_LABEL_H = 30;
export const PLAYER_LABEL_W = 124;

export const TAG_DISTANCE = PLAYER_RADIUS * 2 + 8;
export const TAG_COOLDOWN = 0.55;
export const PICKUP_DISTANCE = 44;

export const DEFAULT_ROUND_LENGTH = 75;
export const MIN_ROUND_LENGTH = 15;
export const MAX_ROUND_LENGTH = 180;
export const DEFAULT_SHRINK_INTERVAL = 10;
export const ZONE_MIN_W = 320;
export const ZONE_MIN_H = 180;
export const ZONE_SHRINK_DURATION = 1.6;
export const ZONE_WARN_SECONDS = 2.5;
export const ZONE_INSET = PLAYER_RADIUS + 20;

export const POWER_SPAWN_MIN = 2.2;
export const POWER_SPAWN_MAX = 4.8;
export const POWER_PULSE_WARN = 1;
export const POWER_RADIUS = 28;
export const POWER_TOKEN = 72;
export const POWER_MAX_ON_BOARD = 10;

export const WALL_WIDTH = 140;
export const WALL_THICKNESS = 26;
export const WALL_LIFETIME = 5;
export const WALL_PLACE_OFFSET = 46;

export const GHOST_DURATION = 2;
export const SPEED_DURATION = 2;
export const DECOY_DURATION = 4;
export const FREEZE_DURATION = 1.5;
export const FREEZE_RANGE = 120;
export const SHIELD_DURATION = 12;

export const BOT_THINK_INTERVAL = 0.22;
export const MAX_PLAYERS = 48;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 4;

export const INTERP_DELAY_MS = 80;
