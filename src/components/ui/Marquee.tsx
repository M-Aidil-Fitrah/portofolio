"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

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
  const { lenis } = useSmoothScroll();

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

        let hovering = false;
        const setScale = (value: number, duration: number) =>
          gsap.to(tween, { timeScale: value, duration, overwrite: true });

        const slow = () => {
          hovering = true;
          setScale(0.3, 0.4);
        };
        const resume = () => {
          hovering = false;
          setScale(1, 0.4);
        };
        container.addEventListener("mouseenter", slow);
        container.addEventListener("mouseleave", resume);

        // Scroll faster => marquee spins faster, briefly — makes the type
        // feel physically tied to the page rather than just looping.
        const handleLenisScroll: (instance: { velocity: number }) => void = (
          instance
        ) => {
          if (hovering) return;
          const boost = gsap.utils.clamp(0, 4, Math.abs(instance.velocity) * 0.2);
          setScale(1 + boost, 0.3);
        };
        lenis?.on("scroll", handleLenisScroll);

        return () => {
          container.removeEventListener("mouseenter", slow);
          container.removeEventListener("mouseleave", resume);
          lenis?.off("scroll", handleLenisScroll);
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    {
      scope: containerRef,
      dependencies: [locale, direction, speed, items.join("|"), lenis],
    }
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
