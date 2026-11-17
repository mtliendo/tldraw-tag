"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrPanel({
  value,
  code,
  compact = false,
  projector = false,
}: {
  value: string;
  code: string;
  compact?: boolean;
  projector?: boolean;
}) {
  const size = projector ? 168 : compact ? 108 : 196;
  return (
    <div
      className="panel"
      style={{
        padding: projector ? 16 : compact ? 10 : 16,
        textAlign: "center",
        background: projector ? "#fff" : undefined,
        transform: projector ? "rotate(1.2deg)" : undefined,
      }}
    >
      <div className="kicker" style={{ fontSize: projector ? 14 : undefined }}>
        join
      </div>
      <div
        className="code-xl"
        style={{ fontSize: projector ? 56 : compact ? 28 : undefined, letterSpacing: "0.14em" }}
      >
        {code}
      </div>
      <div
        style={{
          background: "white",
          padding: 8,
          border: "2.5px solid var(--ink)",
          display: "inline-block",
          marginTop: 8,
          boxShadow: "3px 3px 0 var(--ink)",
        }}
      >
        <QRCodeSVG value={value} size={size} level="M" />
      </div>
      {!compact && !projector && (
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          {value}
        </div>
      )}
    </div>
  );
}
