import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export type AdminAuth = {
  sub: string;
  mode: "auth0" | "dev";
};

function domain(): string {
  return (process.env.AUTH0_DOMAIN ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function audience(): string {
  return process.env.AUTH0_AUDIENCE ?? "";
}

export function auth0Configured(): boolean {
  return Boolean(domain() && audience());
}

export function devBypassEnabled(): boolean {
  return process.env.DEV_BYPASS_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export function expectedDevSecret(): string {
  return process.env.DEV_ADMIN_SECRET || "inkt-dev";
}

export async function verifyAdminToken(token: string | undefined | null): Promise<AdminAuth> {
  if (!token) {
    throw new Error("Missing admin access token");
  }

  if (devBypassEnabled()) {
    const secret = expectedDevSecret();
    if (token === secret || token === `dev:${secret}`) {
      return { sub: "dev-admin", mode: "dev" };
    }
  }

  if (!auth0Configured()) {
    throw new Error("Auth0 is not configured on the game server");
  }

  const host = domain();
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${host}/.well-known/jwks.json`));
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://${host}/`,
    audience: audience(),
  });

  const sub = String(payload.sub ?? "");
  if (!sub) throw new Error("Token is missing sub");
  return { sub, mode: "auth0", ...claimBits(payload) };
}

function claimBits(payload: JWTPayload): Record<string, never> {
  void payload;
  return {};
}
