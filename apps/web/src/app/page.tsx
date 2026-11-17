"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <main className="home-grid">
      <section style={{ padding: "8vh 8vw" }}>
        <div className="kicker">tldraw × Colyseus × Auth0</div>
        <h1 style={{ fontSize: "clamp(64px, 10vw, 128px)", lineHeight: 0.9 }}>INK TAG</h1>
        <p style={{ fontSize: 22, maxWidth: 520, color: "var(--muted)" }}>
          A shrinking-zone tag game for live conference audiences. Phones become controllers. The
          projector is a tldraw canvas.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) router.push(`/join/${code.trim().toUpperCase()}`);
          }}
          style={{ display: "flex", gap: 10, marginTop: 28 }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ROOM CODE"
            maxLength={6}
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              padding: "14px 16px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: "#10121c",
              color: "white",
              width: 180,
              fontFamily: "var(--font-mono)",
            }}
          />
          <button className="btn btn-primary" type="submit">
            Join
          </button>
        </form>
        <div style={{ display: "flex", gap: 16, marginTop: 28 }}>
          <a className="btn btn-it" href="/admin">
            Admin
          </a>
          <a className="btn btn-ghost" href="/admin?bots=10">
            Demo with 10 bots
          </a>
        </div>
      </section>
      <section
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(255,45,123,0.28), transparent 42%), radial-gradient(circle at 70% 70%, rgba(108,240,255,0.2), transparent 40%)",
          display: "grid",
          placeItems: "center",
          padding: 40,
        }}
      >
        <div className="panel" style={{ padding: 24, maxWidth: 360 }}>
          <div className="kicker">How it plays</div>
          <ol style={{ paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Admin signs in, creates a room, throws the QR on a projector.</li>
            <li>The crowd joins from their phones. Avatars are paint; powers are loot.</li>
            <li>Whoever is IT at the buzzer loses. Time spent not-IT is your score.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
