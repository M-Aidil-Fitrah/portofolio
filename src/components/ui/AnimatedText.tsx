"use client";

import { useRef, type ElementType } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { fontsReady, DUR, EASE, STAGGER } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";

interface AnimatedTextProps {
  children: React.ReactNode;
  as?: ElementType;
  type?: "lines" | "chars";
  className?: string;
  delay?: number;
  id?: string;
  /** Reveal on scroll-into-view (default) instead of immediately on mount.
   * Set to false only for above-the-fold text (e.g. the hero headline). */
  scrollTrigger?: boolean;
}

/**
 * Reveals text with a masked slide-up (SplitText). Only runs when the
 * visitor has no reduced-motion preference — otherwise the text simply
 * sits in its final, fully-visible state (no separate fallback needed).
 */
export function AnimatedText({
  children,
  as: Tag = "p",
  type = "lines",
  className,
  delay = 0,
  id,
  scrollTrigger = true,
}: AnimatedTextProps) {
  const ref = useRef<HTMLElement>(null);
  const { locale } = useLocale();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let cancelled = false;
        let split: SplitText | null = null;

        fontsReady().then(() => {
          if (cancelled || !el) return;
          split = SplitText.create(el, {
            type: type === "chars" ? "lines,chars" : "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) => {
              const targets = type === "chars" ? self.chars : self.lines;
              return gsap.from(targets, {
                yPercent: 110,
                stagger: type === "chars" ? STAGGER.chars : STAGGER.lines,
                duration: DUR.base,
                ease: EASE.out,
                delay,
                scrollTrigger: scrollTrigger
                  ? { trigger: el, start: "top 85%", once: true }
                  : undefined,
              });
            },
          });
        });

        return () => {
          cancelled = true;
          split?.revert();
        };
      });

      return () => mm.revert();
    },
    {
      scope: ref as React.RefObject<HTMLElement>,
      dependencies: [locale, type],
    }
  );

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
