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
  const size = projector ? 152 : compact ? 108 : 196;
  return (
    <div
      className="panel"
      style={{
        padding: projector ? 18 : compact ? 10 : 16,
        textAlign: "center",
        background: "#fff",
      }}
    >
      <div className="kicker" style={{ fontSize: projector ? 12 : undefined }}>
        scan to join
      </div>
      <div
        style={{
          background: "white",
          padding: 10,
          display: "inline-block",
          marginTop: 12,
          borderRadius: 10,
        }}
      >
        <QRCodeSVG value={value} size={size} level="M" fgColor="#1D1D1F" bgColor="#FFFFFF" />
      </div>
      <div
        className="code-xl"
        style={{ fontSize: projector ? 52 : compact ? 28 : undefined, letterSpacing: "0.06em", marginTop: 8 }}
      >
        {code}
      </div>
      {!compact && (
        <div className="muted" style={{ marginTop: 8, fontSize: 14 }}>
          ink-tag.vercel.app
        </div>
      )}
    </div>
  );
}
