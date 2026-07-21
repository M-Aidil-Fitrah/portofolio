"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLocale } from "@/components/providers/LocaleProvider";

/** The semantic hero title and its seamless, always-on marquee loop. */
export function HeroHeadline({ text }: { text: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  useGSAP(
    () => {
      const root = rootRef.current;
      const track = trackRef.current;
      if (!root || !track) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = Array.from(track.children) as HTMLElement[];
        const period = items[1].offsetLeft - items[0].offsetLeft;
        const wrap = gsap.utils.wrap(-period, 0);

        const tween = gsap.to(track, {
          x: -period,
          duration: 18,
          ease: "none",
          repeat: -1,
          modifiers: {
            x: (value) => `${wrap(parseFloat(value))}px`,
          },
        });

        return () => tween.kill();
      });

      return () => mm.revert();
    },
    {
      scope: rootRef,
      dependencies: [locale, text],
      revertOnUpdate: true,
    }
  );

  const titleClass =
    "flex shrink-0 items-center gap-10 text-[7rem] font-semibold uppercase leading-none text-foreground [letter-spacing:0] sm:text-[11rem] md:text-[14rem] lg:text-[18rem] xl:text-[20rem]";

  return (
    <div ref={rootRef} className="overflow-hidden">
      <div ref={trackRef} className="flex w-max gap-10 whitespace-nowrap will-change-transform">
        <h1 className={titleClass}>
          <span>{text}</span>
          <span aria-hidden="true" className="h-4 w-4 shrink-0 bg-volt sm:h-6 sm:w-6" />
        </h1>
        {Array.from({ length: 3 }, (_, index) => (
          <span key={index} aria-hidden="true" className={titleClass}>
            <span>{text}</span>
            <span className="h-4 w-4 shrink-0 bg-volt sm:h-6 sm:w-6" />
          </span>
        ))}
      </div>
    </div>
  );
}
