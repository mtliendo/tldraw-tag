"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "@colyseus/sdk";
import { getClient } from "@/lib/colyseus";
import { EMPTY_VIEW, type ViewState } from "@/game/types";
import { readRoomState } from "@/game/readState";
import { Interpolator } from "@/game/interpolate";

export type RoomRole = "admin" | "player" | "spectator";

export function useGameRoom(opts: {
  role: RoomRole;
  code?: string;
  create?: boolean;
  name?: string;
  accessToken?: string | null;
  bots?: number;
  roundLength?: number;
  shrinkInterval?: number;
  enabledPowers?: string[];
  enabled?: boolean;
}) {
  const [view, setView] = useState<ViewState>(EMPTY_VIEW);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const roomRef = useRef<Room | null>(null);
  const interp = useRef(new Interpolator());
  const raf = useRef<number>(0);

  const sendInput = useCallback((x: number, y: number) => {
    roomRef.current?.send("input", { x, y });
  }, []);

  const usePower = useCallback(() => {
    roomRef.current?.send("usePower");
  }, []);

  const admin = useCallback((action: string, extra?: Record<string, unknown>) => {
    roomRef.current?.send("admin", { action, ...extra });
  }, []);

  useEffect(() => {
    if (!opts.enabled) return;
    if (opts.create && !opts.accessToken) return;
    if (opts.role === "admin" && !opts.accessToken) return;
    if (!opts.create && !opts.code) return;
    if (opts.role === "player" && !opts.name) return;

    let cancelled = false;
    const client = getClient();

    (async () => {
      try {
        const payload = {
          role: opts.role,
          accessToken: opts.accessToken,
          name: opts.name,
          bots: opts.bots,
          roundLength: opts.roundLength,
          shrinkInterval: opts.shrinkInterval,
          enabledPowers: opts.enabledPowers,
        };
        const room = opts.create
          ? await client.create("tag", payload)
          : await client.joinById(opts.code!, payload);
        if (cancelled) {
          room.leave();
          return;
        }
        roomRef.current = room;
        setSessionId(room.sessionId);
        setConnected(true);
        setError(null);
        const apply = () => {
          const snap = readRoomState(room.state);
          interp.current.push(snap);
        };
        apply();
        room.onStateChange(apply);
        room.onMessage("fx", (event: { type?: string; text?: string }) => {
          if (event?.text) setAnnounce(event.text);
          if (event?.type === "tag" || event?.type === "end") {
            /* view updates via state */
          }
        });
        room.onMessage("error", (msg: { message?: string }) => {
          setError(msg?.message ?? "Server error");
        });
        room.onLeave((code) => {
          if (!cancelled && code !== 1000) setError("Disconnected from room");
          setConnected(false);
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to join");
      }
    })();

    const loop = () => {
      const sampled = interp.current.sample();
      if (sampled) setView(sampled);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf.current);
      roomRef.current?.leave();
      roomRef.current = null;
      setConnected(false);
    };
    // Intentional: connect once options are ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.enabled,
    opts.create,
    opts.code,
    opts.role,
    opts.name,
    opts.accessToken,
    opts.bots,
  ]);

  return { view, connected, error, sessionId, announce, sendInput, usePower, admin, room: roomRef };
}
