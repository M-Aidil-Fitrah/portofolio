"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { fontsReady, DUR, EASE, STAGGER } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";

type TextTag = "p" | "h1" | "h2" | "h3" | "span";

interface AnimatedTextProps {
  children: React.ReactNode;
  as?: TextTag;
  type?: "lines" | "chars";
  className?: string;
  delay?: number;
  id?: string;
  /** Reveal on scroll-into-view (default) instead of immediately on mount.
   * Set to false only for above-the-fold text (e.g. the hero headline). */
  scrollTrigger?: boolean;
  /** Ties per-word opacity to scroll progress (a scrub-read) instead of a
   * one-shot reveal. Overrides `type`/`scrollTrigger`. */
  scrub?: boolean;
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
  scrub = false,
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
            type: scrub
              ? "lines,words"
              : type === "chars"
                ? "lines,chars"
                : "lines",
            mask: scrub ? undefined : "lines",
            autoSplit: true,
            onSplit: (self) => {
              if (scrub) {
                const words = self.words;
                gsap.set(words, { opacity: 0.15 });
                return gsap.to(words, {
                  opacity: 1,
                  stagger: STAGGER.words,
                  ease: "none",
                  scrollTrigger: {
                    trigger: el,
                    start: "top 85%",
                    end: "bottom 55%",
                    scrub: 0.6,
                  },
                });
              }

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
      dependencies: [locale, type, scrub],
    }
  );

  // TS can't unify prop/ref/children types across the TextTag union at the
  // JSX call site; `ref` is only ever used generically as an HTMLElement.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = Tag as any;

  // `key={locale}` forces a full remount on locale change instead of a text
  // patch: SplitText has already replaced this element's original text node
  // with its own wrapper spans, so React's diff on a same-instance re-render
  // ends up updating a node that's no longer the one on screen — the new
  // locale's text silently never appears. A fresh instance sidesteps that.
  return (
    <Component key={locale} ref={ref} id={id} className={className}>
      {children}
    </Component>
  );
}
