import { NextResponse } from "next/server";
import { auth0, isDevBypass } from "@/lib/auth0";

export async function GET() {
  if (isDevBypass()) {
    return NextResponse.json({
      token: process.env.DEV_ADMIN_SECRET || "inkt-dev",
      mode: "dev",
    });
  }

  if (!auth0) {
    return NextResponse.json(
      { error: "Auth0 is not configured. Set AUTH0_* env vars or DEV_BYPASS_AUTH=true." },
      { status: 501 },
    );
  }

  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await auth0.getAccessToken();
    const token = typeof result === "string" ? result : result.token;
    if (!token) {
      return NextResponse.json({ error: "No access token. Check AUTH0_AUDIENCE." }, { status: 403 });
    }
    return NextResponse.json({
      token,
      mode: "auth0",
      user: { name: session.user.name, email: session.user.email, picture: session.user.picture },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "token error";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
