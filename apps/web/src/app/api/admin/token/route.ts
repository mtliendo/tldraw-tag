import { NextResponse } from "next/server";
import { auth0, isDevBypass } from "@/lib/auth0";

export async function GET() {
  if (isDevBypass()) {
    return NextResponse.json({
      isAdmin: true,
      token: process.env.DEV_ADMIN_SECRET || "inkt-dev",
      mode: "dev",
    });
  }

  if (!auth0) {
    return NextResponse.json({ isAdmin: false });
  }

  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ isAdmin: false });
    }
    const result = await auth0.getAccessToken();
    const token = typeof result === "string" ? result : result.token;
    if (!token) {
      return NextResponse.json({ isAdmin: false });
    }
    return NextResponse.json({
      isAdmin: true,
      token,
      mode: "auth0",
      user: { name: session.user.name, email: session.user.email, picture: session.user.picture },
    });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
