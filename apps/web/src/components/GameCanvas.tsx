"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, createShapeId, type Editor, type TLShapeId } from "tldraw";
import "tldraw/tldraw.css";
import {
  ARENA_H,
  ARENA_W,
  MOBILE_BLOB_PX,
  PLAYER_TOKEN,
  POWER_TOKEN,
  ZONE_WARN_SECONDS,
} from "@inkt/shared";
import { INKT_SHAPES } from "@/shapes/inkt-shapes";
import { crowdLabelScale, layoutPlayers } from "@/game/layoutPlayers";
import type { ViewState } from "@/game/types";
import { Confetti } from "@/components/Confetti";

const license = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;
const TOKEN_R = PLAYER_TOKEN / 2;

export function GameCanvas({
  view,
  selfId,
  followZone = true,
  followPlayer = false,
  interactive = false,
  labelScale = 1,
}: {
  view: ViewState;
  selfId?: string | null;
  followZone?: boolean;
  followPlayer?: boolean;
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
      const blobZoom = MOBILE_BLOB_PX / PLAYER_TOKEN;
      const coverZoom = Math.max(vp.w / Math.max(1, zone.w), vp.h / Math.max(1, zone.h));
      const zoom = Math.max(blobZoom, coverZoom);
      const viewW = vp.w / zoom;
      const viewH = vp.h / zoom;
      let left = (self?.x ?? zone.x + zone.w / 2) - viewW / 2;
      let top = (self?.y ?? zone.y + zone.h / 2) - viewH / 2;
      left = Math.min(Math.max(left, zone.x), zone.x + Math.max(0, zone.w - viewW));
      top = Math.min(Math.max(top, zone.y), zone.y + Math.max(0, zone.h - viewH));
      if (viewW >= zone.w) left = zone.x + (zone.w - viewW) / 2;
      if (viewH >= zone.h) top = zone.y + (zone.h - viewH) / 2;
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
      const scale = crowdLabelScale(state.players.length, labelScaleRef.current);

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
          x: pulse.x - 32,
          y: pulse.y - 32,
          props: { w: 64, h: 64, kind: pulse.kind, progress: pulse.progress },
        });
      }
      for (const pow of state.powerUps) {
        make(`pow:${pow.id}`, {
          type: "inkt-power",
          x: pow.x - POWER_TOKEN / 2,
          y: pow.y - POWER_TOKEN / 2,
          props: { w: 64, h: 78, kind: pow.kind },
        });
      }
      for (const decoy of state.decoys) {
        decoyIds.push(
          make(`decoy:${decoy.id}`, {
            type: "inkt-decoy",
            x: decoy.x - TOKEN_R,
            y: decoy.y - TOKEN_R,
            props: { w: 72, h: 72, name: decoy.name, avatar: decoy.avatar },
          }),
        );
      }
      const now = Date.now();
      const laid = layoutPlayers(state.players, state.zone, scale, selfId);
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
        const showLabel = p.showLabel || joinFlash || p.id === hoverId || p.id === selfId || p.isIt;
        playerIds.push(
          make(`player:${p.id}`, {
            type: "inkt-player",
            x: p.x - TOKEN_R,
            y: p.y - TOKEN_R,
            props: {
              w: 72,
              h: 72,
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
      if (followPlayerRef.current) fit(editor, state);
    },
    [selfId, hoverId, fit],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.store.mergeRemoteChanges(() => sync(editor, view));
  }, [view, sync]);

  const zoneSig = `${view.zone.x.toFixed(0)}:${view.zone.y.toFixed(0)}:${view.zone.w.toFixed(0)}:${view.zone.h.toFixed(0)}`;
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const frame = requestAnimationFrame(() => fit(editor, view));
    return () => cancelAnimationFrame(frame);
  }, [zoneSig, fit, view, followPlayer]);

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
      style={{ ["--inkt-label-scale" as string]: String(crowdLabelScale(view.players.length, labelScale)) }}
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
