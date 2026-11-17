import type { PowerId } from "@inkt/shared";

export type ViewPlayer = {
  id: string;
  sessionId: string;
  name: string;
  avatar: string;
  tint: number;
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

export type ViewState = {
  code: string;
  phase: string;
  timeLeft: number;
  roundLength: number;
  zone: { x: number; y: number; w: number; h: number };
  targetZone: { x: number; y: number; w: number; h: number };
  shrinkIn: number;
  shrinking: boolean;
  itId: string;
  itName: string;
  enabledPowers: string[];
  players: ViewPlayer[];
  powerUps: { id: string; kind: PowerId | string; x: number; y: number }[];
  pulses: { id: string; kind: string; x: number; y: number; progress: number }[];
  walls: { id: string; x: number; y: number; w: number; h: number }[];
  decoys: { id: string; ownerId: string; name: string; avatar: string; x: number; y: number }[];
  leaderboard: {
    id: string;
    name: string;
    avatar: string;
    tint: number;
    score: number;
    isIt: boolean;
    isBot: boolean;
  }[];
  lastAnnounce: string;
};

export const EMPTY_VIEW: ViewState = {
  code: "",
  phase: "lobby",
  timeLeft: 75,
  roundLength: 75,
  zone: { x: 0, y: 0, w: 1600, h: 900 },
  targetZone: { x: 0, y: 0, w: 1600, h: 900 },
  shrinkIn: 10,
  shrinking: false,
  itId: "",
  itName: "",
  enabledPowers: [],
  players: [],
  powerUps: [],
  pulses: [],
  walls: [],
  decoys: [],
  leaderboard: [],
  lastAnnounce: "",
};
