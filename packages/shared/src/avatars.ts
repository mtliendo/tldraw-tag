export type AvatarDef = {
  id: string;
  label: string;
  color: string;
  accent: string;
  glyph: "bolt" | "orb" | "fox" | "bot" | "cat" | "bird" | "gem" | "shark" | "star" | "leaf";
};

/** tldraw default solids, limited to six fills. */
export const AVATARS: AvatarDef[] = [
  { id: "bolt", label: "Bolt", color: "#f1ac4b", accent: "#1d1d1d", glyph: "bolt" },
  { id: "orb", label: "Orb", color: "#4465e9", accent: "#1d1d1d", glyph: "orb" },
  { id: "fox", label: "Fox", color: "#e16919", accent: "#1d1d1d", glyph: "fox" },
  { id: "bot", label: "Bot", color: "#9fa8b2", accent: "#1d1d1d", glyph: "bot" },
  { id: "cat", label: "Cat", color: "#e03131", accent: "#1d1d1d", glyph: "cat" },
  { id: "bird", label: "Bird", color: "#099268", accent: "#1d1d1d", glyph: "bird" },
  { id: "gem", label: "Gem", color: "#4465e9", accent: "#1d1d1d", glyph: "gem" },
  { id: "shark", label: "Shark", color: "#9fa8b2", accent: "#1d1d1d", glyph: "shark" },
  { id: "star", label: "Star", color: "#f1ac4b", accent: "#1d1d1d", glyph: "star" },
  { id: "leaf", label: "Leaf", color: "#099268", accent: "#1d1d1d", glyph: "leaf" },
];

export function avatarById(id: string | undefined | null): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
