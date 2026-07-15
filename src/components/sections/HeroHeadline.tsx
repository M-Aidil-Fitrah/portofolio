"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { fontsReady, DUR, EASE, STAGGER } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";

/**
 * The hero name: reveals char-by-char on load, then — for fine pointers
 * with no reduced-motion preference — each character quietly flinches away
 * from the cursor as it passes nearby. Rest positions are measured once
 * right after the split so the effect never reads its own transformed
 * layout (no read/write thrashing, no feedback loop).
 */
export function HeroHeadline({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { locale } = useLocale();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      let split: SplitText | null = null;
      let cancelled = false;
      let removeMouseListener: (() => void) | undefined;

      const mm = gsap.matchMedia();
      mm.add(
        {
          canHover: "(pointer: fine)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { canHover, reduceMotion } = context.conditions as {
            canHover: boolean;
            reduceMotion: boolean;
          };
          if (reduceMotion) return;

          fontsReady().then(() => {
            if (cancelled || !el) return;

            split = SplitText.create(el, {
              type: "lines,chars",
              mask: "lines",
              autoSplit: true,
              onSplit: (self) => {
                const chars = self.chars as HTMLElement[];

                const reveal = gsap.from(chars, {
                  yPercent: 110,
                  stagger: STAGGER.chars,
                  duration: DUR.base,
                  ease: EASE.out,
                });

                if (canHover) {
                  const centers = chars.map((c) => {
                    const rect = c.getBoundingClientRect();
                    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                  });
                  const xTo = chars.map((c) =>
                    gsap.quickTo(c, "x", { duration: 0.6, ease: "power3.out" })
                  );
                  const yTo = chars.map((c) =>
                    gsap.quickTo(c, "y", { duration: 0.6, ease: "power3.out" })
                  );
                  const radius = 130;

                  const handleMove = (e: MouseEvent) => {
                    centers.forEach((center, i) => {
                      const dx = e.clientX - center.x;
                      const dy = e.clientY - center.y;
                      const dist = Math.hypot(dx, dy);
                      if (dist < radius) {
                        const power = 1 - dist / radius;
                        xTo[i](-dx * power * 0.45);
                        yTo[i](-dy * power * 0.45);
                      } else {
                        xTo[i](0);
                        yTo[i](0);
                      }
                    });
                  };

                  window.addEventListener("mousemove", handleMove);
                  removeMouseListener = () =>
                    window.removeEventListener("mousemove", handleMove);
                }

                return reveal;
              },
            });
          });
        }
      );

      return () => {
        cancelled = true;
        removeMouseListener?.();
        split?.revert();
        mm.revert();
      };
    },
    { scope: ref as React.RefObject<HTMLElement>, dependencies: [locale] }
  );

  return (
    <h1
      ref={ref}
      className="mt-6 flex flex-col text-[clamp(3rem,12vw,11rem)] font-semibold uppercase leading-[0.92] tracking-tight"
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </h1>
  );
}
