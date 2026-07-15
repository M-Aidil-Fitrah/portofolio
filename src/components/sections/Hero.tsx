"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "@/components/providers/LocaleProvider";
import { HeroHeadline } from "@/components/sections/HeroHeadline";

const HeroScene = dynamic(
  () => import("@/components/three/HeroScene").then((mod) => mod.HeroScene),
  { ssr: false }
);

export function Hero() {
  const { t } = useLocale();
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const requestIdle =
      window.requestIdleCallback ??
      ((cb: IdleRequestCallback) =>
        window.setTimeout(() => cb({} as IdleDeadline), 300));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;

    const id = requestIdle(() => setShowScene(true));
    return () => cancelIdle(id);
  }, []);

  return (
    <section
      id="top"
      aria-label="Intro"
      className="relative flex min-h-svh flex-col justify-center overflow-hidden px-6 pt-24 pb-16 sm:px-10"
    >
      {showScene && <HeroScene />}

      <div className="relative z-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          {t.hero.eyebrow}
        </p>

        <HeroHeadline lines={t.hero.lines} />

        <p className="mt-8 max-w-xl font-accent text-2xl italic text-muted sm:text-3xl">
          {t.hero.subline.pre}
          <span className="text-foreground">{t.hero.subline.italic}</span>
          {t.hero.subline.post}
        </p>

        <div className="mt-16 flex flex-wrap gap-x-3 gap-y-2 border-t border-hairline pt-4 font-mono text-xs uppercase tracking-widest text-muted">
          {t.hero.marquee.map((item, i) => (
            <span key={item} className="flex items-center gap-3">
              {item}
              {i < t.hero.marquee.length - 1 && (
                <span aria-hidden="true" className="text-volt">
                  —
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
