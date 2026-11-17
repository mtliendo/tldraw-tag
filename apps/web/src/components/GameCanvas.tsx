"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, createShapeId, type Editor, type TLShapeId } from "tldraw";
import "tldraw/tldraw.css";
import {
  ARENA_H,
  ARENA_W,
  MOBILE_BLOB_PX,
  PLAYER_TOKEN,
  POWER_PULSE,
  POWER_TOKEN,
  RING_PAD,
  ZONE_WARN_SECONDS,
  clampToZoneArt,
  playerTint,
} from "@inkt/shared";
import { INKT_SHAPES } from "@/shapes/inkt-shapes";
import { liveLabelScale, layoutPlayers } from "@/game/layoutPlayers";
import type { ViewState } from "@/game/types";
import { Confetti } from "@/components/Confetti";

const license = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;
const TOKEN_R = PLAYER_TOKEN / 2;

type FollowPad = { left: number; right: number; top: number; bottom: number };

export function GameCanvas({
  view,
  selfId,
  followZone = true,
  followPlayer = false,
  followPad,
  blobPx = MOBILE_BLOB_PX,
  interactive = false,
  labelScale = 1,
}: {
  view: ViewState;
  selfId?: string | null;
  followZone?: boolean;
  followPlayer?: boolean;
  followPad?: FollowPad;
  blobPx?: number;
  interactive?: boolean;
  labelScale?: number;
}) {
  const editorRef = useRef<Editor | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const known = useRef(new Set<TLShapeId>());
  const prevIt = useRef(new Map<string, boolean>());
  const squashUntil = useRef(new Map<string, number>());
  const followZoneRef = useRef(followZone);
  followZoneRef.current = followZone;
  const followPlayerRef = useRef(followPlayer);
  followPlayerRef.current = followPlayer;
  const followPadRef = useRef(followPad);
  followPadRef.current = followPad;
  const blobPxRef = useRef(blobPx);
  blobPxRef.current = blobPx;
  const labelScaleRef = useRef(labelScale);
  labelScaleRef.current = labelScale;
  const viewRef = useRef(view);
  viewRef.current = view;
  const selfIdRef = useRef(selfId);
  selfIdRef.current = selfId;
  const seenPlayers = useRef(new Set<string>());
  const flashUntil = useRef(new Map<string, number>());
  const [hoverId, setHoverId] = useState<string | null>(null);

  const fit = useCallback((editor: Editor, state = viewRef.current) => {
    const el = wrapRef.current;
    if (el) editor.updateViewportScreenBounds(el);
    const screen = el?.getBoundingClientRect();
    const vp = {
      w: Math.max(1, screen?.width ?? editor.getViewportScreenBounds().width),
      h: Math.max(1, screen?.height ?? editor.getViewportScreenBounds().height),
    };
    editor.setCameraOptions({
      isLocked: false,
      panSpeed: 1,
      zoomSpeed: 1,
      zoomSteps: [0.05, 8],
      wheelBehavior: "none",
      constraints: undefined,
    });
    const zone = state.zone;
    if (followPlayerRef.current) {
      const self =
        state.players.find((p) => p.id === selfIdRef.current) ?? state.players[0];
      const blobZoom = Math.max(32, blobPxRef.current) / PLAYER_TOKEN;
      const coverZoom = Math.max(vp.w / Math.max(1, zone.w), vp.h / Math.max(1, zone.h));
      const zoom = Math.max(blobZoom, coverZoom);
      const viewW = vp.w / zoom;
      const viewH = vp.h / zoom;
      const pad = followPadRef.current ?? { left: 0, right: 0, top: 0, bottom: 0 };
      const innerW = Math.max(1, vp.w - pad.left - pad.right);
      const innerH = Math.max(1, vp.h - pad.top - pad.bottom);
      const focusX = pad.left + innerW / 2;
      const focusY = pad.top + innerH / 2;
      const originX = self?.x ?? zone.x + zone.w / 2;
      const originY = self?.y ?? zone.y + zone.h / 2;
      let left = originX - focusX / zoom;
      let top = originY - focusY / zoom;
      left = Math.min(Math.max(left, zone.x), zone.x + Math.max(0, zone.w - viewW));
      top = Math.min(Math.max(top, zone.y), zone.y + Math.max(0, zone.h - viewH));
      if (viewW >= zone.w) left = zone.x + (zone.w - viewW) / 2;
      if (viewH >= zone.h) top = zone.y + (zone.h - viewH) / 2;
      // zoomToBounds() never zooms *in* past a fit, so Play-again (full arena)
      // would stay zoomed-out. Set the follow zoom explicitly.
      editor.stopCameraAnimation();
      editor.setCamera({ x: -left, y: -top, z: zoom }, { immediate: true, force: true });
    } else {
      editor.zoomToBounds(
        { x: zone.x, y: zone.y, w: zone.w, h: zone.h },
        { inset: 8, immediate: true, force: true, animation: { duration: 0 } },
      );
    }
    editor.setCameraOptions({
      isLocked: true,
      panSpeed: 1,
      zoomSpeed: 1,
      zoomSteps: [0.05, 8],
      wheelBehavior: "none",
      constraints: undefined,
    });
  }, []);

  const sync = useCallback(
    (editor: Editor, state: ViewState) => {
      const next = new Set<TLShapeId>();
      const puts: any[] = [];
      const playerIds: TLShapeId[] = [];
      const decoyIds: TLShapeId[] = [];
      const make = (key: string, partial: object) => {
        const id = createShapeId(key);
        next.add(id);
        if (known.current.has(id)) {
          puts.push({ id, ...partial });
        } else {
          editor.createShape({ id, ...partial } as any);
          known.current.add(id);
        }
        return id;
      };

      const warning =
        !state.shrinking && state.shrinkIn > 0 && state.shrinkIn <= ZONE_WARN_SECONDS ? 1 : 0;
      const scale = liveLabelScale(state.players.length, labelScaleRef.current, state.zone);

      make("arena", {
        type: "inkt-arena",
        x: 0,
        y: 0,
        props: { w: ARENA_W, h: ARENA_H },
      });
      make("dim", {
        type: "inkt-dim",
        x: 0,
        y: 0,
        props: {
          w: ARENA_W,
          h: ARENA_H,
          hx: state.zone.x,
          hy: state.zone.y,
          hw: state.zone.w,
          hh: state.zone.h,
        },
      });
      make("next-zone", {
        type: "inkt-next-zone",
        x: state.targetZone.x,
        y: state.targetZone.y,
        props: { w: state.targetZone.w, h: state.targetZone.h, warn: warning },
      });
      make("zone", {
        type: "inkt-zone",
        x: state.zone.x,
        y: state.zone.y,
        props: {
          w: state.zone.w,
          h: state.zone.h,
          warn: warning,
          shrinking: state.shrinking,
        },
      });
      for (const wall of state.walls) {
        make(`wall:${wall.id}`, {
          type: "inkt-wall",
          x: wall.x,
          y: wall.y,
          props: { w: wall.w, h: wall.h },
        });
      }
      for (const pulse of state.pulses) {
        make(`pulse:${pulse.id}`, {
          type: "inkt-pulse",
          x: pulse.x - POWER_PULSE / 2,
          y: pulse.y - POWER_PULSE / 2,
          props: { w: POWER_PULSE, h: POWER_PULSE, kind: pulse.kind, progress: pulse.progress },
        });
      }
      for (const pow of state.powerUps) {
        make(`pow:${pow.id}`, {
          type: "inkt-power",
          x: pow.x - POWER_TOKEN / 2,
          y: pow.y - POWER_TOKEN / 2,
          props: { w: POWER_TOKEN, h: POWER_TOKEN, kind: pow.kind },
        });
      }
      const now = Date.now();
      const ended = state.phase === "ended";
      const zone = state.zone;
      const players = state.players.map((p) => ({ ...p, ...clampToZoneArt(p.x, p.y, zone) }));
      const decoys = state.decoys.map((d) => ({ ...d, ...clampToZoneArt(d.x, d.y, zone) }));
      for (const decoy of decoys) {
        decoyIds.push(
          make(`decoy:${decoy.id}`, {
            type: "inkt-decoy",
            x: decoy.x - TOKEN_R,
            y: decoy.y - TOKEN_R,
            props: { w: PLAYER_TOKEN, h: PLAYER_TOKEN, name: decoy.name, avatar: decoy.avatar },
          }),
        );
      }
      const inset = ended ? 10 : 8;
      const clampBox = {
        x: zone.x + inset,
        y: zone.y + inset,
        w: Math.max(48, zone.w - inset * 2),
        h: Math.max(48, zone.h - inset * 2),
      };
      const hole = ended
        ? [
            {
              x: state.zone.x + state.zone.w * 0.1,
              y: state.zone.y + state.zone.h * 0.06,
              w: state.zone.w * 0.8,
              h: state.zone.h * 0.7,
            },
          ]
        : [];
      const wallHoles = state.walls.map((wall) => ({
        x: wall.x,
        y: wall.y,
        w: wall.w,
        h: wall.h,
      }));
      const laid = layoutPlayers(players, zone, scale, selfId, {
        clamp: clampBox,
        avoid: [...hole, ...wallHoles],
      });
      for (const p of laid) {
        const wasIt = prevIt.current.get(p.id);
        if (wasIt !== undefined && wasIt !== p.isIt) {
          squashUntil.current.set(p.id, now + 420);
        }
        prevIt.current.set(p.id, p.isIt);
        if (!seenPlayers.current.has(p.id)) {
          if (seenPlayers.current.size > 0) flashUntil.current.set(p.id, now + 2400);
          seenPlayers.current.add(p.id);
        }
        const joinFlash = (flashUntil.current.get(p.id) ?? 0) > now;
        const showLabel = followPlayerRef.current
          ? p.id === selfId || p.isIt || p.frozen || joinFlash || p.id === hoverId
          : p.showLabel || joinFlash || p.id === hoverId || p.id === selfId || p.isIt;
        playerIds.push(
          make(`player:${p.id}`, {
            type: "inkt-player",
            x: p.x - TOKEN_R,
            y: p.y - TOKEN_R,
            props: {
              w: PLAYER_TOKEN,
              h: PLAYER_TOKEN,
              name: p.name,
              avatar: p.avatar,
              isIt: p.isIt,
              ghost: p.ghost,
              frozen: p.frozen,
              boosting: p.boosting,
              hasShield: p.hasShield,
              powerId: p.powerId,
              charges: p.charges,
              self: p.id === selfId,
              labelX: p.labelX,
              labelY: p.labelY,
              labelAbove: p.labelAbove,
              labelSide: p.labelSide,
              labelLeader: p.labelLeader,
              labelW: p.labelW,
              labelStack: 0,
              squash: (squashUntil.current.get(p.id) ?? 0) > now,
              showLabel,
              joinFlash,
              playerId: p.id,
              labelScale: scale,
              vx: p.vx,
              vy: p.vy,
              tint: playerTint(p, players),
            },
          }),
        );
      }

      const stale = [...known.current].filter((id) => !next.has(id));
      if (stale.length) {
        editor.deleteShapes(stale as TLShapeId[]);
        for (const id of stale) known.current.delete(id);
      }
      if (puts.length) editor.updateShapes(puts);
      if (decoyIds.length) editor.bringToFront(decoyIds);
      if (playerIds.length) editor.bringToFront(playerIds);
      if (followPlayerRef.current) fit(editor, { ...state, players, decoys });
    },
    [selfId, hoverId, fit],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.store.mergeRemoteChanges(() => sync(editor, view));
  }, [view, sync]);

  const zoneSig = `${view.zone.x.toFixed(0)}:${view.zone.y.toFixed(0)}:${view.zone.w.toFixed(0)}:${view.zone.h.toFixed(0)}`;
  const phase = view.phase;
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    let second = 0;
    const frame = requestAnimationFrame(() => {
      fit(editor);
      second = requestAnimationFrame(() => fit(editor));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(second);
    };
  }, [zoneSig, phase, fit, followPlayer, followPad, blobPx]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const editor = editorRef.current;
      if (editor) fit(editor);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  return (
    <div
      ref={wrapRef}
      className={interactive ? "board-wrap interactive" : "board-wrap"}
      style={{
        ["--inkt-label-scale" as string]: String(liveLabelScale(view.players.length, labelScale, view.zone)),
        ["--inkt-ring" as string]: `${RING_PAD}px`,
      }}
      onPointerOver={(e) => {
        if (!interactive) return;
        const el = (e.target as HTMLElement).closest("[data-player-id]");
        const id = el?.getAttribute("data-player-id") ?? null;
        setHoverId(id);
      }}
      onPointerLeave={() => {
        if (interactive) setHoverId(null);
      }}
    >
      <Tldraw
        licenseKey={license}
        hideUi
        shapeUtils={INKT_SHAPES}
        options={{ zoomToFitPadding: 0 }}
        cameraOptions={{ isLocked: false, zoomSteps: [0.05, 8], wheelBehavior: "none" }}
        onMount={(editor) => {
          editorRef.current = editor;
          editor.updateInstanceState({ isGridMode: false });
          editor.user.updateUserPreferences({ colorScheme: "light" });
          editor.setCurrentTool("hand");
          known.current = new Set();
          sync(editor, view);
          fit(editor);
          requestAnimationFrame(() => fit(editor));
          editor.sideEffects.registerAfterChangeHandler("instance_page_state", () => {
            if (editor.getSelectedShapeIds().length) editor.setSelectedShapes([]);
          });
        }}
      />
      {view.phase === "ended" && <Confetti />}
    </div>
  );
}
