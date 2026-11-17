"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, createShapeId, type Editor, type TLShapeId } from "tldraw";
import "tldraw/tldraw.css";
import { ARENA_H, ARENA_W, PLAYER_TOKEN, POWER_TOKEN, ZONE_WARN_SECONDS } from "@inkt/shared";
import { INKT_SHAPES } from "@/shapes/inkt-shapes";
import { layoutPlayers } from "@/game/layoutPlayers";
import type { ViewState } from "@/game/types";
import { Confetti } from "@/components/Confetti";

const license = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;
const TOKEN_R = PLAYER_TOKEN / 2;
const LABEL_CROWD = 15;

export function GameCanvas({
  view,
  selfId,
  fitMode = "contain",
  interactive = false,
}: {
  view: ViewState;
  selfId?: string | null;
  fitMode?: "contain" | "cover";
  interactive?: boolean;
}) {
  const editorRef = useRef<Editor | null>(null);
  const known = useRef(new Set<TLShapeId>());
  const prevIt = useRef(new Map<string, boolean>());
  const squashUntil = useRef(new Map<string, number>());
  const fitModeRef = useRef(fitMode);
  fitModeRef.current = fitMode;
  const [hoverId, setHoverId] = useState<string | null>(null);

  const fit = useCallback((editor: Editor) => {
    editor.setCameraOptions({ isLocked: false });
    if (fitModeRef.current === "cover") {
      const vsb = editor.getViewportScreenBounds();
      const aspect = vsb.w / Math.max(1, vsb.h);
      let bw = ARENA_W;
      let bh = ARENA_W / aspect;
      if (bh > ARENA_H) {
        bh = ARENA_H;
        bw = ARENA_H * aspect;
      }
      const bx = (ARENA_W - bw) / 2;
      const by = (ARENA_H - bh) / 2;
      editor.zoomToBounds({ x: bx, y: by, w: bw, h: bh }, { inset: 6, animation: { duration: 0 } });
    } else {
      editor.zoomToBounds(
        { x: -48, y: -48, w: ARENA_W + 96, h: ARENA_H + 96 },
        { inset: 8, animation: { duration: 0 } },
      );
    }
    editor.setCameraOptions({ isLocked: true });
    editor.setCamera(editor.getCamera());
  }, []);

  const sync = useCallback(
    (editor: Editor, state: ViewState) => {
      const next = new Set<TLShapeId>();
      const puts: any[] = [];
      const make = (key: string, partial: object) => {
        const id = createShapeId(key);
        next.add(id);
        if (known.current.has(id)) {
          puts.push({ id, ...partial });
        } else {
          editor.createShape({ id, ...partial } as any);
          known.current.add(id);
        }
      };

      const warning =
        !state.shrinking && state.shrinkIn > 0 && state.shrinkIn <= ZONE_WARN_SECONDS ? 1 : 0;
      const crowded = state.players.length > LABEL_CROWD;

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
        make(`decoy:${decoy.id}`, {
          type: "inkt-decoy",
          x: decoy.x - 40,
          y: decoy.y - 40,
          props: { w: 80, h: 80, name: decoy.name, avatar: decoy.avatar },
        });
      }
      const now = Date.now();
      const laid = layoutPlayers(state.players, state.zone);
      for (const p of laid) {
        const wasIt = prevIt.current.get(p.id);
        if (wasIt !== undefined && wasIt !== p.isIt) {
          squashUntil.current.set(p.id, now + 420);
        }
        prevIt.current.set(p.id, p.isIt);
        const stack = p.labelStack ?? 0;
        const showLabel =
          p.isIt || p.id === selfId || p.frozen || !crowded || p.id === hoverId;
        const boxH = TOKEN_R * 2 + 8 + (showLabel ? 20 + stack * 18 : 0);
        make(`player:${p.id}`, {
          type: "inkt-player",
          x: p.x - 70,
          y: p.y - TOKEN_R,
          props: {
            w: 140,
            h: boxH,
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
            labelAbove: false,
            labelStack: stack,
            squash: (squashUntil.current.get(p.id) ?? 0) > now,
            showLabel,
            playerId: p.id,
          },
        });
      }

      const stale = [...known.current].filter((id) => !next.has(id));
      if (stale.length) {
        editor.deleteShapes(stale as TLShapeId[]);
        for (const id of stale) known.current.delete(id);
      }
      if (puts.length) editor.updateShapes(puts);
    },
    [selfId, hoverId],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.store.mergeRemoteChanges(() => sync(editor, view));
  }, [view, sync]);

  return (
    <div
      className={interactive ? "board-wrap interactive" : "board-wrap"}
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
        onMount={(editor) => {
          editorRef.current = editor;
          editor.updateInstanceState({ isGridMode: false });
          editor.user.updateUserPreferences({ colorScheme: "light" });
          editor.setCurrentTool("hand");
          known.current = new Set();
          sync(editor, view);
          fit(editor);
          const onResize = () => fit(editor);
          requestAnimationFrame(() => fit(editor));
          window.addEventListener("resize", onResize);
          editor.sideEffects.registerAfterChangeHandler("instance_page_state", () => {
            if (editor.getSelectedShapeIds().length) editor.setSelectedShapes([]);
          });
          return () => window.removeEventListener("resize", onResize);
        }}
      />
      {view.phase === "ended" && <Confetti />}
    </div>
  );
}
