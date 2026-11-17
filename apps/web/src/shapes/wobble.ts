/** tldraw-draw-style wobbly rectangle path. */
export function wobbleRectPath(w: number, h: number, seed = 1, jitter = 6) {
  const steps = 7;
  const pts: { x: number; y: number }[] = [];
  const j = (i: number, axis: number) =>
    Math.sin((i + seed) * 12.9898 + axis * 78.233) * jitter +
    Math.cos((i + seed) * 4.141 + axis) * (jitter * 0.35);

  const pushEdge = (x0: number, y0: number, x1: number, y1: number, axis: number) => {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      pts.push({
        x: x0 + (x1 - x0) * t + j(i, axis),
        y: y0 + (y1 - y0) * t + j(i + 3, axis + 1),
      });
    }
  };

  const pad = 5;
  pushEdge(pad, pad, w - pad, pad, 1);
  pushEdge(w - pad, pad, w - pad, h - pad, 2);
  pushEdge(w - pad, h - pad, pad, h - pad, 3);
  pushEdge(pad, h - pad, pad, pad, 4);

  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ") + " Z";
}

export function blobPath(size: number, seed = 1) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const n = 8;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const wobble = 1 + Math.sin(seed * 2.1 + i * 1.7) * 0.08;
    return {
      x: cx + Math.cos(a) * r * wobble,
      y: cy + Math.sin(a) * r * 0.92 * wobble,
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
