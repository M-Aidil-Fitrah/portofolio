"use client";

import Link from "next/link";
import { useRef } from "react";
import { Logomark } from "@/components/ui/Logomark";
import { useLocale } from "@/components/providers/LocaleProvider";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE } from "@/lib/animation";

/** The preloader assembles the logomark; the 404 page is its inverse — the
 * facets hang scattered and slowly drift, never resolving. Scatter is
 * applied by GSAP so the mark renders whole (and the page fully readable)
 * if JS never runs; reduced motion gets the scatter pose without the
 * drift. */
const SCATTER = [
  { x: -30, y: -20, rotation: -10 },
  { x: 34, y: -10, rotation: 8 },
  { x: -26, y: 16, rotation: 6 },
  { x: 30, y: 26, rotation: -9 },
  { x: -14, y: 38, rotation: 10 },
];

export default function NotFound() {
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const logo = logoRef.current;
      if (!logo) return;

      const facets = Array.from(
        logo.querySelectorAll<SVGPathElement>("[data-logomark-facet]")
      );
      facets.forEach((facet, i) => {
        const pose = SCATTER[i % SCATTER.length];
        gsap.set(facet, {
          x: pose.x,
          y: pose.y,
          rotation: pose.rotation,
          transformOrigin: "50% 50%",
          opacity: 0.85,
        });
      });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tweens = facets.map((facet, i) =>
          gsap.to(facet, {
            y: `+=${6 + (i % 3) * 3}`,
            rotation: `+=${i % 2 === 0 ? 3 : -3}`,
            duration: DUR.slow + i * 0.35,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          })
        );
        return () => tweens.forEach((tw) => tw.kill());
      });

      gsap.from(rootRef.current, {
        opacity: 0,
        y: 16,
        duration: DUR.base,
        ease: EASE.out,
      });

      return () => mm.revert();
    },
    { scope: rootRef as React.RefObject<HTMLElement> }
  );

  return (
    <main
      id="main"
      className="flex min-h-svh flex-col items-center justify-center px-6 py-24 text-center"
    >
      <div ref={rootRef} className="flex flex-col items-center">
        <Logomark
          ref={logoRef}
          className="h-40 w-auto text-hairline sm:h-52"
        />
        <p className="mt-10 font-mono text-sm tracking-[0.3em] text-volt">
          {t.notFound.code}
        </p>
        <h1 className="mt-4 text-3xl font-semibold uppercase tracking-tight sm:text-5xl">
          {t.notFound.heading}
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          {t.notFound.body}
        </p>
        <Link
          href="/"
          className="btn-fill mt-10 inline-flex h-12 items-center gap-2 rounded-pill border border-volt px-6 font-mono text-xs uppercase tracking-widest text-volt"
        >
          &larr; {t.notFound.back}
        </Link>
      </div>
    </main>
  );
}
