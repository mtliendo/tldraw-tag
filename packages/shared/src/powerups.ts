export type PowerId =
  | "speedster"
  | "paver"
  | "ghost"
  | "decoy"
  | "freezer"
  | "swapper"
  | "shield";

export type PowerDef = {
  id: PowerId;
  label: string;
  verb: string;
  color: string;
  ink: string;
  charges: number;
  spawnWeight: number;
  description: string;
  autoActivate?: boolean;
};

export const POWER_UPS: Record<PowerId, PowerDef> = {
  speedster: {
    id: "speedster",
    label: "Speedster",
    verb: "BOOST",
    color: "#FFD166",
    ink: "#3A2A00",
    charges: 3,
    spawnWeight: 1.2,
    description: "Three 2-second speed bursts.",
  },
  paver: {
    id: "paver",
    label: "Paver",
    verb: "WALL",
    color: "#FF9F1C",
    ink: "#3A2200",
    charges: 4,
    spawnWeight: 1,
    description: "Drop 4 blocking walls that last 5s.",
  },
  ghost: {
    id: "ghost",
    label: "Ghost",
    verb: "PHASE",
    color: "#E8ECFF",
    ink: "#1B1F3A",
    charges: 2,
    spawnWeight: 1,
    description: "Pass through walls and players for 2s, twice.",
  },
  decoy: {
    id: "decoy",
    label: "Decoy",
    verb: "CLONE",
    color: "#7AE7FF",
    ink: "#042A36",
    charges: 1,
    spawnWeight: 0.9,
    description: "Spawn a fake copy that drifts for 4s.",
  },
  freezer: {
    id: "freezer",
    label: "Freezer",
    verb: "FREEZE",
    color: "#6B8CFF",
    ink: "#071230",
    charges: 1,
    spawnWeight: 0.9,
    description: "Freeze the nearest player in range for 1.5s.",
  },
  swapper: {
    id: "swapper",
    label: "Swapper",
    verb: "SWAP",
    color: "#C084FC",
    ink: "#2A0848",
    charges: 1,
    spawnWeight: 0.8,
    description: "Swap positions with a random player.",
  },
  shield: {
    id: "shield",
    label: "Shield",
    verb: "GUARD",
    color: "#3DFFC8",
    ink: "#043328",
    charges: 1,
    spawnWeight: 1,
    description: "Block the next tag.",
  },
};

export const POWER_IDS = Object.keys(POWER_UPS) as PowerId[];

export function isPowerId(value: string): value is PowerId {
  return value in POWER_UPS;
}

export function allPowerIds(): PowerId[] {
  return [...POWER_IDS];
}

export function pickWeightedPower(enabled: PowerId[], rand: () => number): PowerId | null {
  const pool = enabled.filter((id) => POWER_UPS[id]);
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, id) => sum + POWER_UPS[id].spawnWeight, 0);
  let roll = rand() * total;
  for (const id of pool) {
    roll -= POWER_UPS[id].spawnWeight;
    if (roll <= 0) return id;
  }
  return pool[pool.length - 1];
}
