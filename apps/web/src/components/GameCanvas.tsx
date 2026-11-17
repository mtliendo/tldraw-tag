"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, createShapeId, type Editor, type TLShapeId } from "tldraw";
import "tldraw/tldraw.css";
import { ARENA_H, ARENA_W } from "@inkt/shared";
import { INKT_SHAPES } from "@/shapes/inkt-shapes";
import type { ViewState } from "@/game/types";

const license = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;

export function GameCanvas({
  view,
  selfId,
}: {
  view: ViewState;
  selfId?: string | null;
}) {
  const editorRef = useRef<Editor | null>(null);
  const known = useRef(new Set<TLShapeId>());

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

      make("arena", {
        type: "inkt-arena",
        x: 0,
        y: 0,
        props: { w: ARENA_W, h: ARENA_H },
      });
      make("zone", {
        type: "inkt-zone",
        x: state.zone.x,
        y: state.zone.y,
        props: { w: state.zone.w, h: state.zone.h },
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
          x: pulse.x - 35,
          y: pulse.y - 35,
          props: { w: 70, h: 70, kind: pulse.kind, progress: pulse.progress },
        });
      }
      for (const pow of state.powerUps) {
        make(`pow:${pow.id}`, {
          type: "inkt-power",
          x: pow.x - 18,
          y: pow.y - 18,
          props: { w: 36, h: 36, kind: pow.kind },
        });
      }
      for (const decoy of state.decoys) {
        make(`decoy:${decoy.id}`, {
          type: "inkt-decoy",
          x: decoy.x - 28,
          y: decoy.y - 36,
          props: { w: 56, h: 72, name: decoy.name, avatar: decoy.avatar },
        });
      }
      for (const p of state.players) {
        make(`player:${p.id}`, {
          type: "inkt-player",
          x: p.x - 28,
          y: p.y - 28,
          props: {
            w: 56,
            h: 72,
            name: p.name,
            avatar: p.avatar,
            isIt: p.isIt,
            ghost: p.ghost,
            frozen: p.frozen,
            boosting: p.boosting,
            hasShield: p.hasShield,
            powerId: p.powerId,
            self: p.id === selfId,
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
          editor.updateInstanceState({ isGridMode: false });
          editor.user.updateUserPreferences({ colorScheme: "dark" });
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
    </div>
  );
}
