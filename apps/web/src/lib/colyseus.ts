import { Client, type Room } from "@colyseus/sdk";

let client: Client | null = null;

export function colyseusUrl(): string {
  return process.env.NEXT_PUBLIC_COLYSEUS_URL || "ws://localhost:2567";
}

export function getClient(): Client {
  if (!client) client = new Client(colyseusUrl());
  return client;
}

export type TagRoom = Room;

export function appUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "http://localhost:3000";
}

export function joinUrl(code: string): string {
  return `${appUrl()}/join/${code}`;
}

export function screenUrl(code: string): string {
  return `${appUrl()}/screen/${code}`;
}
