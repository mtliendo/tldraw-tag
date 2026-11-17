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
      <div className="panel" style={{ width: "min(520px, 100%)", padding: 28 }}>
        <div className="kicker">Room {code}</div>
        <h1 style={{ fontSize: 48, margin: "4px 0 8px" }}>Get in.</h1>
        <p className="muted">No login. Pick a face, drop a name, survive the zone.</p>
        <label className="kicker">Display name</label>
        <input
          autoFocus
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{
            width: "100%",
            margin: "8px 0 18px",
            padding: "14px 12px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "#0b0d16",
            color: "white",
            fontSize: 20,
          }}
        />
        <div className="kicker">Avatar — cosmetic only</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, margin: "10px 0 20px" }}>
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAvatar(a.id)}
              style={{
                aspectRatio: "1",
                borderRadius: 16,
                border: avatar === a.id ? "3px solid white" : "1px solid var(--line)",
                background: a.color,
                display: "grid",
                placeItems: "center",
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
