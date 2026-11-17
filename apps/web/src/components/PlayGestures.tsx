"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Joystick } from "@/components/Joystick";
import { idleGesture, reduceGesture, type GestureEvent, type GestureState, type ZoomLimits } from "@/game/playGestures";

export function PlayGestures({
  enabled,
  limits,
  onZoom,
  onMove,
  avatar,
  tint = 0,
  hint = false,
}: {
  enabled: boolean;
  limits: ZoomLimits;
  onZoom: (zoom: number | null) => void;
  onMove: (x: number, y: number) => void;
  avatar?: string;
  tint?: number;
  hint?: boolean;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const limitsRef = useRef(limits);
  limitsRef.current = limits;
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const zoomOut = useRef(onZoom);
  zoomOut.current = onZoom;
  const [state, setState] = useState<GestureState>(() => idleGesture(limits.base));
  const stateRef = useRef(state);
  stateRef.current = state;

  const local = useCallback((clientX: number, clientY: number) => {
    const el = layer.current;
    if (!el) return { x: clientX, y: clientY };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }, []);

  const dispatch = useCallback((event: GestureEvent) => {
    const prev = stateRef.current;
    const next = reduceGesture(prev, event, { now: Date.now(), limits: limitsRef.current });
    stateRef.current = next;
    setState(next);
    if (next.input.x !== prev.input.x || next.input.y !== prev.input.y) {
      moveRef.current(next.input.x, next.input.y);
    }
    if (event.type === "reset") zoomOut.current(null);
    else if (next.zoom !== prev.zoom) zoomOut.current(next.zoom);
  }, []);

  useEffect(() => {
    if (!state.fading) return;
    const wait = Math.max(0, state.fadeUntil - Date.now());
    const t = window.setTimeout(() => {
      setState((cur) => (cur.fading ? { ...cur, fading: null, fadeUntil: 0 } : cur));
    }, wait);
    return () => window.clearTimeout(t);
  }, [state.fading, state.fadeUntil]);

  useEffect(() => {
    if (!enabled) return;
    const node = layer.current;
    if (!node) return;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      const p = local(e.clientX, e.clientY);
      dispatch({ type: "down", id: e.pointerId, x: p.x, y: p.y });
    };
    const move = (e: PointerEvent) => {
      const p = local(e.clientX, e.clientY);
      dispatch({ type: "move", id: e.pointerId, x: p.x, y: p.y });
    };
    const up = (e: PointerEvent) => dispatch({ type: "up", id: e.pointerId });
    node.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    const reset = () => dispatch({ type: "reset" });
    window.addEventListener("inkt-reset-gestures", reset);
    return () => {
      node.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("inkt-reset-gestures", reset);
    };
  }, [dispatch, enabled, local]);

  const stick = state.stick ?? state.fading;
  const fading = Boolean(!state.stick && state.fading);

  if (!enabled) return null;

  return (
    <div
      ref={layer}
      data-inkt="play-gestures"
      data-inkt-zoom={state.zoom.toFixed(4)}
      data-inkt-mode={state.mode}
      className="play-gestures"
    >
      {stick ? (
        <Joystick origin={stick.origin} knob={stick.knob} fading={fading} avatar={avatar} tint={tint} />
      ) : null}
      {hint && state.mode === "idle" && !state.moved ? (
        <div data-inkt="move-hint" className="play-move-hint">
          touch anywhere to move
        </div>
      ) : null}
    </div>
  );
}
