"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AVATARS } from "@inkt/shared";
import { AvatarGlyph } from "@/components/AvatarGlyph";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0].id);

  const can = name.trim().length > 0;
  const selected = useMemo(() => AVATARS.find((a) => a.id === avatar) ?? AVATARS[0], [avatar]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="panel" style={{ width: "min(520px, 100%)", padding: 28, transform: "rotate(-0.6deg)" }}>
        <div className="kicker">Room {code}</div>
        <h1 style={{ fontSize: "clamp(36px, 10vw, 48px)", margin: "4px 0 8px" }}>Get in.</h1>
        <p className="muted">No login. Pick a doodle, drop a name, survive the zone.</p>
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
        <div className="kicker">Avatar — doodle only</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, margin: "10px 0 20px" }}>
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAvatar(a.id)}
              style={{
                aspectRatio: "1",
                borderRadius: "50%",
                border: avatar === a.id ? "1.5px solid var(--ink)" : "1.5px solid var(--ink)",
                background: a.color,
                display: "grid",
                placeItems: "center",
                boxShadow: avatar === a.id ? "var(--shadow)" : "none",
                transform: avatar === a.id ? "rotate(-4deg) scale(1.04)" : "rotate(2deg)",
              }}
              aria-label={a.label}
            >
              <AvatarGlyph glyph={a.glyph} accent={a.accent} />
            </button>
          ))}
        </div>
        <button
          className="btn btn-it"
          style={{ width: "100%" }}
          disabled={!can}
          onClick={() => {
            sessionStorage.setItem(`inkt:${code}`, JSON.stringify({ name: name.trim(), avatar: selected.id }));
            router.push(`/play/${code}`);
          }}
        >
          Join {code}
        </button>
      </div>
    </main>
  );
}
