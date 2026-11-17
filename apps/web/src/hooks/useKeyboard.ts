"use client";

import { useEffect, useRef } from "react";

const KEYS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

export function useKeyboard(opts: {
  enabled: boolean;
  onMove: (x: number, y: number) => void;
  onPower: () => void;
}) {
  const held = useRef(new Set<string>());
  const onMove = useRef(opts.onMove);
  const onPower = useRef(opts.onPower);
  onMove.current = opts.onMove;
  onPower.current = opts.onPower;

  useEffect(() => {
    if (!opts.enabled) return;
    const emit = () => {
      let x = 0;
      let y = 0;
      for (const code of held.current) {
        const v = KEYS[code];
        if (!v) continue;
        x += v.x;
        y += v.y;
      }
      const mag = Math.hypot(x, y);
      if (mag > 1) {
        x /= mag;
        y /= mag;
      }
      onMove.current(x, y);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        onPower.current();
        return;
      }
      if (!KEYS[e.code]) return;
      held.current.add(e.code);
      emit();
    };
    const up = (e: KeyboardEvent) => {
      if (!KEYS[e.code]) return;
      held.current.delete(e.code);
      emit();
    };
    const blur = () => {
      held.current.clear();
      onMove.current(0, 0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      onMove.current(0, 0);
    };
  }, [opts.enabled]);
}
