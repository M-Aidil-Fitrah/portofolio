"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLocale } from "@/components/providers/LocaleProvider";

interface MarqueeProps {
  items: string[];
  direction?: "left" | "right";
  speed?: number;
  className?: string;
}

export function Marquee({
  items,
  direction = "left",
  speed = 28,
  className,
}: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  useGSAP(
    () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const totalWidth = track.scrollWidth / 2;
        const wrap =
          direction === "left"
            ? gsap.utils.wrap(-totalWidth, 0)
            : gsap.utils.wrap(0, totalWidth);

        const tween = gsap.to(track, {
          x: direction === "left" ? -totalWidth : totalWidth,
          duration: speed,
          ease: "none",
          repeat: -1,
          modifiers: {
            x: (x) => `${wrap(parseFloat(x))}px`,
          },
        });

        const slow = () => tween.timeScale(0.3);
        const resume = () => tween.timeScale(1);
        container.addEventListener("mouseenter", slow);
        container.addEventListener("mouseleave", resume);

        return () => {
          container.removeEventListener("mouseenter", slow);
          container.removeEventListener("mouseleave", resume);
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [locale, direction, speed, items.join("|")] }
  );

  return (
    <div ref={containerRef} className={`overflow-hidden ${className ?? ""}`}>
      <div ref={trackRef} className="flex w-max gap-10 whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span
            key={`${item}-${i}`}
            aria-hidden={i >= items.length}
            className="font-mono text-sm uppercase tracking-widest text-muted"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
