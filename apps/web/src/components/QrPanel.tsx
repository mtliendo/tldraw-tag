"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrPanel({
  value,
  code,
  compact = false,
}: {
  value: string;
  code: string;
  compact?: boolean;
}) {
  const size = compact ? 108 : 196;
  return (
    <div className="panel" style={{ padding: compact ? 10 : 16, textAlign: "center" }}>
      <div className="kicker">Join</div>
      <div className="code-xl" style={{ fontSize: compact ? 28 : undefined, letterSpacing: "0.2em" }}>
        {code}
      </div>
      <div
        style={{
          background: "white",
          padding: 8,
          borderRadius: 12,
          display: "inline-block",
          marginTop: 8,
        }}
      >
        <QRCodeSVG value={value} size={size} level="M" />
      </div>
      {!compact && <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>{value}</div>}
    </div>
  );
}
