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
  // At minimum 2 back-to-back copies of `items` are needed for the loop to
  // wrap seamlessly. But on a viewport wider than one copy's rendered
  // width, 2 copies alone leave a visible bare-track gap once per cycle —
  // the tail of copy 2 clears the container before copy 1 wraps back into
  // view. More copies are rendered until the track is always wider than
  // container + one period, so every scroll offset stays fully covered.
  const [repeatCount, setRepeatCount] = useState(2);

  useGSAP(
    () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // `scrollWidth / repeatCount` looks like the right per-copy width,
        // but `gap` only sits *between* children, so it's off by a
        // fraction of a gap. Measuring from the first item of copy 1 to
        // the first item of copy 2 gives the exact period (including the
        // connecting gap) instead — and stays exact regardless of how many
        // extra copies are rendered after that.
        const children = Array.from(track.children) as HTMLElement[];
        const totalWidth = children[items.length].offsetLeft - children[0].offsetLeft;

        const needed = Math.max(
          2,
          Math.ceil((container.clientWidth + totalWidth) / totalWidth)
        );
        if (needed > repeatCount) {
          // Not enough copies rendered to cover this viewport — bump the
          // count and bail; the re-render feeds back into this same effect
          // (repeatCount is a dependency below) before any tween starts.
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

        // A later viewport resize (window widened, or an orientation
        // change) can outgrow the copy count that was sufficient at setup
        // time — recheck and bump it the same way the initial measurement
        // did.
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
      scope: containerRef.current ? containerRef : undefined,
      dependencies: [locale, direction, speed, items.join("|"), lenis, repeatCount],
      // Without this, @gsap/react defers the returned cleanup to unmount
      // only (see PreviewProvider's fix for the full explanation) — every
      // locale switch or repeatCount bump would start a brand new tween
      // and listener set on top of the old ones instead of replacing them.
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
