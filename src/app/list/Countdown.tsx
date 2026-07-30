"use client";

import { useEffect, useState } from "react";

// Live countdown to the order cutoff. Renders on the client so it ticks; the
// server has already decided lock state, this is just the visible timer.
export default function Countdown({ cutoffMs }: { cutoffMs: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Avoid hydration mismatch: render nothing until mounted.
  if (now === null) return null;

  const remaining = cutoffMs - now;
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
