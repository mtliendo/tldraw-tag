"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();
  const [name, setName] = useState("");

  const can = name.trim().length > 0;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="panel" style={{ width: "min(440px, 100%)", padding: 28 }}>
        <div className="kicker">Room {code}</div>
        <h1 style={{ fontSize: "clamp(36px, 10vw, 48px)", margin: "4px 0 8px" }}>Get in.</h1>
        <p className="muted">No login. Drop a name — we hand you a critter when you join.</p>
        <label className="kicker">Display name</label>
        <input
          autoFocus
          className="sketch-input"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{ margin: "8px 0 18px" }}
        />
        <button
          className="btn btn-it"
          style={{ width: "100%" }}
          disabled={!can}
          onClick={() => {
            sessionStorage.setItem(`inkt:${code}`, JSON.stringify({ name: name.trim() }));
            router.push(`/play/${code}`);
          }}
        >
          Join {code}
        </button>
      </div>
    </main>
  );
}
