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
      <button className="btn btn-it" type="button" onClick={onPlayAgain} style={{ minWidth: 200, justifyContent: "center" }}>
        Play again
      </button>
    );
  }
  return (
    <div className="chip">
      waiting for host
    </div>
  );
}
