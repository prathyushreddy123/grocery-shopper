"use client";

import { useSyncExternalStore } from "react";

// The clock is an external mutable source, so we subscribe to it rather than
// mirroring it into state — that keeps the server render and the first client
// render identical (both null) with no setState during mount.
function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

// Floored to whole seconds so repeated reads inside one render return the
// same value, which is what useSyncExternalStore requires of a snapshot.
const getSnapshot = (): number | null => Math.floor(Date.now() / 1000);
const getServerSnapshot = (): number | null => null;

// Live countdown to the order cutoff. Renders on the client so it ticks; the
// server has already decided lock state, this is just the visible timer.
export default function Countdown({ cutoffMs }: { cutoffMs: number }) {
  const nowSec = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Not mounted yet (server render / hydration): render nothing.
  if (nowSec === null) return null;

  const remaining = cutoffMs - nowSec * 1000;
  if (remaining <= 0) {
    return <span className="font-semibold">Ordering has closed</span>;
  }

  const s = Math.floor(remaining / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [
    d > 0 ? `${d}d` : null,
    `${h}h`,
    `${m}m`,
    d === 0 ? `${sec}s` : null,
  ].filter(Boolean);

  return (
    <span>
      <span className="font-semibold tabular-nums">{parts.join(" ")}</span>{" "}
      left to order
    </span>
  );
}
