import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { TagRoom } from "./rooms/TagRoom.js";
import { auth0Configured, devBypassEnabled } from "./auth/verifyAuth0.js";

const port = Number(process.env.PORT) || 2567;
const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const gameServer = new Server({
  transport: new WebSocketTransport({}),
  express: (app) => {
    app.use(
      cors({
        origin: origins.length ? origins : true,
        credentials: true,
      }),
    );
    app.use(express.json());
    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        service: "inkt-tag",
        auth0: auth0Configured(),
        devBypass: devBypassEnabled(),
      });
    });
  },
});

gameServer.define("tag", TagRoom);

await gameServer.listen(port);
console.log(`INK TAG server on :${port}`);
console.log(`  Auth0: ${auth0Configured() ? "JWKS verify enabled" : "not configured"}`);
console.log(`  Dev bypass: ${devBypassEnabled() ? "ON" : "off"}`);
