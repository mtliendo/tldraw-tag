"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, createShapeId, type Editor, type TLShapeId } from "tldraw";
import "tldraw/tldraw.css";
import { ARENA_H, ARENA_W, PLAYER_TOKEN, POWER_TOKEN, ZONE_WARN_SECONDS } from "@inkt/shared";
import { INKT_SHAPES } from "@/shapes/inkt-shapes";
import { layoutPlayers } from "@/game/layoutPlayers";
import type { ViewState } from "@/game/types";
import { Confetti } from "@/components/Confetti";

const license = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;
const TOKEN_R = PLAYER_TOKEN / 2;

export function GameCanvas({
  view,
  selfId,
}: {
  view: ViewState;
  selfId?: string | null;
}) {
  const editorRef = useRef<Editor | null>(null);
  const known = useRef(new Set<TLShapeId>());
  const prevIt = useRef(new Map<string, boolean>());
  const squashUntil = useRef(new Map<string, number>());

  const fit = useCallback((editor: Editor) => {
    editor.setCameraOptions({ isLocked: false });
    editor.zoomToBounds(
      { x: -48, y: -48, w: ARENA_W + 96, h: ARENA_H + 96 },
      { inset: 8, animation: { duration: 0 } },
    );
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

      const warn =
        state.shrinking || (state.shrinkIn > 0 && state.shrinkIn <= ZONE_WARN_SECONDS) ? 1 : 0;

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
        props: { w: state.targetZone.w, h: state.targetZone.h, warn },
      });
      make("zone", {
        type: "inkt-zone",
        x: state.zone.x,
        y: state.zone.y,
        props: {
          w: state.zone.w,
          h: state.zone.h,
          warn,
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
          x: pulse.x - 55,
          y: pulse.y - 55,
          props: { w: 110, h: 110, kind: pulse.kind, progress: pulse.progress },
        });
      }
      for (const pow of state.powerUps) {
        make(`pow:${pow.id}`, {
          type: "inkt-power",
          x: pow.x - POWER_TOKEN / 2,
          y: pow.y - POWER_TOKEN / 2,
          props: { w: 88, h: 100, kind: pow.kind },
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
        const above = p.labelAbove;
        make(`player:${p.id}`, {
          type: "inkt-player",
          x: p.x - 100,
          y: p.y - (above ? TOKEN_R + 36 : TOKEN_R),
          props: {
            w: 200,
            h: 140,
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
            labelAbove: above,
            squash: (squashUntil.current.get(p.id) ?? 0) > now,
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
    [selfId],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.store.mergeRemoteChanges(() => sync(editor, view));
  }, [view, sync]);

  return (
    <div className="board-wrap">
      <Tldraw
        licenseKey={license}
        hideUi
        shapeUtils={INKT_SHAPES}
        onMount={(editor) => {
          editorRef.current = editor;
          editor.updateInstanceState({ isGridMode: true });
          editor.user.updateUserPreferences({ colorScheme: "light" });
          editor.setCurrentTool("hand");
          known.current = new Set();
          sync(editor, view);
          fit(editor);
          const onResize = () => fit(editor);
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
