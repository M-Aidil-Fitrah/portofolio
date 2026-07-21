"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { fontsReady, DUR, EASE, STAGGER } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { onIntroDone } from "@/lib/introState";

/**
 * The hero wordmark: reveals char-by-char on load, then — for fine pointers
 * with no reduced-motion preference — each character quietly flinches away
 * from the cursor as it passes nearby. Rest positions are measured once
 * right after the split so the effect never reads its own transformed
 * layout (no read/write thrashing, no feedback loop).
 */
export function HeroHeadline({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { locale } = useLocale();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      let split: SplitText | null = null;
      let cancelled = false;
      let removeMouseListener: (() => void) | undefined;
      let removeIntroListener: (() => void) | undefined;

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

          const introReady = new Promise<void>((resolve) => {
            removeIntroListener = onIntroDone(resolve);
          });

          Promise.all([fontsReady(), introReady]).then(() => {
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
                    gsap.quickTo(c, "x", { duration: 0.6, ease: EASE.out })
                  );
                  const yTo = chars.map((c) =>
                    gsap.quickTo(c, "y", { duration: 0.6, ease: EASE.out })
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
        removeIntroListener?.();
        split?.revert();
        mm.revert();
      };
    },
    {
      scope: ref as React.RefObject<HTMLElement>,
      dependencies: [locale],
      // See PreviewProvider's fix for why this is required: without it
      // @gsap/react never calls this cleanup on a dependency change (only
      // on unmount), so the old SplitText/mousemove listener would leak
      // every locale toggle instead of being reverted first.
      revertOnUpdate: true,
    }
  );

  // See AnimatedText for why `key={locale}` (not just the effect's
  // `dependencies: [locale]`) is required: SplitText has already replaced
  // this element's text node with its own spans, so a same-instance
  // re-render can't land new text on the node actually on screen.
  return (
    <h1
      key={locale}
      ref={ref}
      className="whitespace-nowrap text-[clamp(3rem,16vw,21rem)] font-semibold uppercase leading-none tracking-tight"
    >
      {text}
    </h1>
  );
}
