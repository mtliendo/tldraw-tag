export type AvatarState = "idle" | "run1" | "run2" | "it" | "stunned" | "ghost" | "shield" | "frozen";

export type AvatarDef = {
  id: string;
  label: string;
  color: string;
  accent: string;
};

/** Direction A critter cast. Body fills are the minimap / tint keys. */
export const AVATARS: AvatarDef[] = [
  { id: "otter", label: "Otter", color: "#A9754F", accent: "#F3DCC2" },
  { id: "cat", label: "Cat", color: "#9EA7BA", accent: "#F6C3CF" },
  { id: "frog", label: "Frog", color: "#6CC46B", accent: "#D2F0A8" },
  { id: "bunny", label: "Bunny", color: "#F6F1EA", accent: "#F7B5C6" },
  { id: "bear", label: "Bear", color: "#C68A55", accent: "#EFD0A6" },
  { id: "fox", label: "Fox", color: "#F28A3C", accent: "#FFF4E6" },
  { id: "penguin", label: "Penguin", color: "#33405F", accent: "#FFFFFF" },
  { id: "axolotl", label: "Axolotl", color: "#F8AFCB", accent: "#FFD9E6" },
  { id: "ghosty", label: "Ghosty", color: "#EEF0FB", accent: "#D7DBF2" },
  { id: "duck", label: "Duck", color: "#FFD43B", accent: "#FF9F1C" },
  { id: "dino", label: "Dino", color: "#5CC59A", accent: "#D6F2C6" },
  { id: "octopus", label: "Octopus", color: "#A78BFA", accent: "#D4C6FF" },
  { id: "buddy", label: "Blob buddy", color: "#4FC3D9", accent: "#BDF0F7" },
];

const LEGACY: Record<string, string> = {
  bolt: "otter",
  orb: "frog",
  bot: "buddy",
  bird: "duck",
  gem: "dino",
  shark: "octopus",
  star: "bear",
  leaf: "penguin",
};

export const AVATAR_STATES: AvatarState[] = [
  "idle",
  "run1",
  "run2",
  "it",
  "stunned",
  "ghost",
  "shield",
  "frozen",
];

export function resolveAvatarId(id: string | undefined | null): string {
  if (!id) return AVATARS[0].id;
  if (LEGACY[id]) return LEGACY[id];
  if (AVATARS.some((a) => a.id === id)) return id;
  return AVATARS[0].id;
}

export function avatarById(id: string | undefined | null): AvatarDef {
  const resolved = resolveAvatarId(id);
  return AVATARS.find((a) => a.id === resolved) ?? AVATARS[0];
}

/** 0 for the first copy of a critter, 1+ for repeats (hue-rotate steps). */
export function avatarTintIndex(
  players: { id: string; avatar: string }[],
  playerId: string,
  avatar: string,
): number {
  const key = resolveAvatarId(avatar);
  const same = players.filter((p) => resolveAvatarId(p.avatar) === key);
  const idx = same.findIndex((p) => p.id === playerId);
  return Math.max(0, idx);
}

/** Hue-rotate degrees per extra copy of the same critter. */
export const AVATAR_TINT_STEP = 52;

export function assignedCritterLine(avatar: string | undefined | null): string {
  return `You're the ${avatarById(avatar).label.toLowerCase()}!`;
}
