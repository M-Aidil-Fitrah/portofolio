"use client";

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Local-time readout; blank until mount to avoid an SSR time mismatch. */
export function LiveClock({ className }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(formatter.format(new Date()));
    const id = window.setInterval(tick, 1000);
    const raf = requestAnimationFrame(tick);
    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span className={className} suppressHydrationWarning>
      {time ?? "00:00:00"}
    </span>
  );
}
