"use client";

import { useEffect, useState } from "react";
import { AdminDesk } from "@/components/AdminDesk";

export function AdminTokenGate({ userName }: { userName?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState("dev");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/token")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not get admin token");
        setToken(body.token);
        setMode(body.mode);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <main style={{ padding: 48 }}>
        <h1>Admin token failed</h1>
        <p className="muted">{error}</p>
      </main>
    );
  }
  if (!token) {
    return (
      <main style={{ padding: 48 }}>
        <p className="muted">Minting admin token…</p>
      </main>
    );
  }
  return <AdminDesk token={token} mode={mode} userName={userName} />;
}
