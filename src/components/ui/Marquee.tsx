"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

interface MarqueeProps {
  items: string[];
  direction?: "left" | "right";
  speed?: number;
  className?: string;
  /** Custom render per item (e.g. an icon) — falls back to plain text. */
  renderItem?: (item: string) => React.ReactNode;
}

export function Marquee({
  items,
  direction = "left",
  speed = 28,
  className,
  renderItem,
}: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const { lenis } = useSmoothScroll();
  // Copies grow until the track outruns the container, or a gap shows per cycle.
  const [repeatCount, setRepeatCount] = useState(2);

  useGSAP(
    () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Gaps only sit between children, so measure copy 1 to copy 2.
        const children = Array.from(track.children) as HTMLElement[];
        const totalWidth = children[items.length].offsetLeft - children[0].offsetLeft;

        const needed = Math.max(
          2,
          Math.ceil((container.clientWidth + totalWidth) / totalWidth)
        );
        if (needed > repeatCount) {
          // Too few copies for this viewport: bump and bail before any tween.
          setRepeatCount(needed);
          return;
        }

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

        // Scroll speed nudges the marquee, tying it to the page.
        const handleLenisScroll: (instance: { velocity: number }) => void = (
          instance
        ) => {
          if (hovering) return;
          const boost = gsap.utils.clamp(0, 4, Math.abs(instance.velocity) * 0.2);
          setScale(1 + boost, 0.3);
        };
        lenis?.on("scroll", handleLenisScroll);

        // A resize can outgrow the copy count that sufficed at setup.
        const handleResize = () => {
          const need = Math.max(
            2,
            Math.ceil((container.clientWidth + totalWidth) / totalWidth)
          );
          if (need > repeatCount) setRepeatCount(need);
        };
        window.addEventListener("resize", handleResize);

        return () => {
          container.removeEventListener("mouseenter", slow);
          container.removeEventListener("mouseleave", resume);
          window.removeEventListener("resize", handleResize);
          lenis?.off("scroll", handleLenisScroll);
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    {
      scope: containerRef,
      dependencies: [locale, direction, speed, items.join("|"), lenis, repeatCount],
      // Otherwise @gsap/react stacks a tween per locale or repeatCount change.
      revertOnUpdate: true,
    }
  );

  return (
    <div ref={containerRef} className={`overflow-hidden ${className ?? ""}`}>
      <div ref={trackRef} className="flex w-max gap-10 whitespace-nowrap">
        {Array.from({ length: repeatCount }, (_, copy) => copy).flatMap((copy) =>
          items.map((item, i) =>
            renderItem ? (
              <span key={`${item}-${copy}-${i}`} aria-hidden={copy > 0}>
                {renderItem(item)}
              </span>
            ) : (
              <span
                key={`${item}-${copy}-${i}`}
                aria-hidden={copy > 0}
                className="font-mono text-sm uppercase tracking-widest text-muted"
              >
                {item}
              </span>
            )
          )
        )}
      </div>
    </div>
  );
}
