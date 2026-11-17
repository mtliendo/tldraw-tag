"use client";

export function PlayAgain({
  canHost,
  onPlayAgain,
}: {
  canHost: boolean;
  onPlayAgain: () => void;
}) {
  if (canHost) {
    return (
      <button className="btn btn-it" type="button" onClick={onPlayAgain}>
        Play again
      </button>
    );
  }
  return (
    <div className="chip" style={{ background: "var(--card)" }}>
      waiting for host
    </div>
  );
}
