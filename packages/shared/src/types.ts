import type { PowerId } from "./powerups";

export type GamePhase = "lobby" | "playing" | "paused" | "ended";

export type ClientRole = "admin" | "player" | "spectator";

export type Vec2 = { x: number; y: number };

export type Rect = { x: number; y: number; w: number; h: number };

export type LeaderboardRow = {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isIt: boolean;
  isBot: boolean;
};

export type AdminConfig = {
  roundLength: number;
  shrinkInterval: number;
  enabledPowers: PowerId[];
};

export type InputState = {
  x: number;
  y: number;
  usePower: boolean;
};

export type EnginePlayer = {
  id: string;
  sessionId: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  isIt: boolean;
  isBot: boolean;
  score: number;
  powerId: PowerId | "";
  charges: number;
  speedUntil: number;
  ghostUntil: number;
  frozenUntil: number;
  hasShield: boolean;
  lastTaggedAt: number;
  thinkAt: number;
  wanderX: number;
  wanderY: number;
};

export type EnginePowerUp = {
  id: string;
  kind: PowerId;
  x: number;
  y: number;
};

export type EnginePulse = {
  id: string;
  kind: PowerId;
  x: number;
  y: number;
  spawnAt: number;
};

export type EngineWall = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  expiresAt: number;
};

export type EngineDecoy = {
  id: string;
  ownerId: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expiresAt: number;
};

export type EngineEvent =
  | { type: "tag"; fromId: string; toId: string; blocked?: boolean }
  | { type: "pickup"; playerId: string; kind: PowerId }
  | { type: "power"; playerId: string; kind: PowerId }
  | { type: "shrink" }
  | { type: "start" }
  | { type: "end"; itId: string | null }
  | { type: "announce"; text: string };

export type EngineState = {
  code: string;
  phase: GamePhase;
  now: number;
  timeLeft: number;
  roundLength: number;
  shrinkInterval: number;
  nextShrinkAt: number;
  shrinkEndsAt: number;
  nextPowerAt: number;
  showcaseUntil: number;
  zone: Rect;
  fromZone: Rect;
  targetZone: Rect;
  enabledPowers: PowerId[];
  itId: string;
  players: Record<string, EnginePlayer>;
  powerUps: Record<string, EnginePowerUp>;
  pulses: Record<string, EnginePulse>;
  walls: Record<string, EngineWall>;
  decoys: Record<string, EngineDecoy>;
  leaderboard: LeaderboardRow[];
  events: EngineEvent[];
};

export type PublicPlayer = {
  id: string;
  sessionId: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isIt: boolean;
  isBot: boolean;
  score: number;
  powerId: string;
  charges: number;
  ghost: boolean;
  frozen: boolean;
  boosting: boolean;
  hasShield: boolean;
};

export type PublicState = {
  code: string;
  phase: GamePhase;
  now: number;
  timeLeft: number;
  roundLength: number;
  zone: Rect;
  targetZone: Rect;
  shrinkIn: number;
  shrinking: boolean;
  itId: string;
  itName: string;
  enabledPowers: PowerId[];
  players: PublicPlayer[];
  powerUps: EnginePowerUp[];
  pulses: Array<EnginePulse & { progress: number }>;
  walls: EngineWall[];
  decoys: EngineDecoy[];
  leaderboard: LeaderboardRow[];
};
