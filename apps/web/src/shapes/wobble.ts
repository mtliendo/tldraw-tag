/** Gentle tldraw-draw rectangle: one smooth stroke, slight wobble. */
export function wobbleRectPath(w: number, h: number, seed = 1, jitter = 2.4) {
  const j = (i: number, axis: number) =>
    Math.sin((i + seed) * 2.3 + axis) * jitter + Math.cos((i + seed) * 1.1 + axis * 0.7) * jitter * 0.35;

  const pad = 1;
  const x0 = pad;
  const y0 = pad;
  const x1 = w - pad;
  const y1 = h - pad;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;

  return [
    `M ${x0 + j(0, 1)} ${y0 + j(0, 2)}`,
    `Q ${mx + j(1, 1)} ${y0 + j(1, 2)} ${x1 + j(2, 1)} ${y0 + j(2, 2)}`,
    `Q ${x1 + j(3, 1)} ${my + j(3, 2)} ${x1 + j(4, 1)} ${y1 + j(4, 2)}`,
    `Q ${mx + j(5, 1)} ${y1 + j(5, 2)} ${x0 + j(6, 1)} ${y1 + j(6, 2)}`,
    `Q ${x0 + j(7, 1)} ${my + j(7, 2)} ${x0 + j(0, 1)} ${y0 + j(0, 2)}`,
    "Z",
  ].join(" ");
}

export function blobPath(size: number, seed = 1) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const n = 8;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const wobble = 1 + Math.sin(seed * 1.4 + i * 1.3) * 0.035;
    return {
      x: cx + Math.cos(a) * r * wobble,
      y: cy + Math.sin(a) * r * 0.96 * wobble,
    };
  });
  const d = pts
    .map((p, i) => {
      const n1 = pts[(i + 1) % pts.length];
      const mx = (p.x + n1.x) / 2;
      const my = (p.y + n1.y) / 2;
      return i === 0 ? `M ${mx} ${my}` : `Q ${p.x} ${p.y} ${mx} ${my}`;
    })
    .join(" ");
  return d + " Z";
}
