import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth0, isAuth0Enabled, isDevBypass } from "@/lib/auth0";
import { AdminTokenGate } from "@/components/AdminTokenGate";

export default async function AdminPage() {
  if (isDevBypass()) {
    return (
      <Suspense>
        <AdminTokenGate />
      </Suspense>
    );
  }

  if (!isAuth0Enabled() || !auth0) {
    return (
      <main style={{ padding: 48, maxWidth: 640 }}>
        <div className="kicker">Setup required</div>
        <h1>Auth0 is not configured</h1>
        <p className="muted">
          Create a Regular Web Application and an API in Auth0, then set AUTH0_DOMAIN, AUTH0_CLIENT_ID,
          AUTH0_CLIENT_SECRET, AUTH0_SECRET, AUTH0_AUDIENCE, and APP_BASE_URL. For a local dry-run, set
          DEV_BYPASS_AUTH=true on both the web app and the Colyseus server.
        </p>
      </main>
    );
  }

  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/admin");

  return (
    <Suspense>
      <AdminTokenGate userName={session.user.name} />
    </Suspense>
  );
}
