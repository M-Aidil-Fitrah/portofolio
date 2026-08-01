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
  /** Reveal on scroll instead of on mount; false for above-the-fold text. */
  scrollTrigger?: boolean;
  /** Per-word opacity tied to scroll; overrides `type`/`scrollTrigger`. */
  scrub?: boolean;
}

/** Masked slide-up reveal (SplitText); reduced motion leaves the text final. */
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
            onSplit: (self) => {
              if (cancelled) return;
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
                  ? { trigger: el, start: "top 85%", toggleActions: "play none none reverse" }
                  : undefined,
              });
            },
          });

          if (cancelled) {
            split.revert();
          }
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
      // Otherwise @gsap/react leaks a split and ScrollTrigger per locale toggle.
      revertOnUpdate: true,
    }
  );

  // `ref` is only ever used generically as an HTMLElement.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = Tag as any;

  // `key={locale}` remounts: SplitText already replaced the original text node.
  return (
    <Component key={locale} ref={ref} id={id} className={className}>
      {children}
    </Component>
  );
}
