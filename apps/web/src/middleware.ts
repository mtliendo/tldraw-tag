import { NextRequest, NextResponse } from "next/server";
import { auth0, isDevBypass } from "@/lib/auth0";

export async function middleware(request: NextRequest) {
  if (!auth0) {
    return NextResponse.next();
  }

  const response = await auth0.middleware(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !isDevBypass()) {
    const session = await auth0.getSession(request);
    if (!session) {
      const login = new URL("/auth/login", request.url);
      login.searchParams.set("returnTo", pathname + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|docs/).*)",
  ],
};
