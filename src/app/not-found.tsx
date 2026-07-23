"use client";

import Link from "next/link";
import { useRef } from "react";
import { Logomark } from "@/components/ui/Logomark";
import { useLocale } from "@/components/providers/LocaleProvider";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";

type CubeTone = "ghost" | "volt";

interface CubeConfig {
  size: number;
  top: string;
  left: string;
  tone: CubeTone;
  /** Resting tilt — the pose shown until the cursor takes over. */
  rx: number;
  ry: number;
  /** Parallax strength: bigger/"closer" cubes swing further with the cursor. */
  depth: number;
}

const CUBES: CubeConfig[] = [
  { size: 118, top: "10%", left: "12%", tone: "ghost", rx: -22, ry: 28, depth: 1 },
  { size: 54, top: "64%", left: "20%", tone: "ghost", rx: 18, ry: -32, depth: 0.65 },
  { size: 88, top: "20%", left: "70%", tone: "volt", rx: -16, ry: 40, depth: 1.15 },
  { size: 46, top: "66%", left: "76%", tone: "ghost", rx: 26, ry: -18, depth: 0.6 },
];

/* A real closed cube — all six faces positioned in 3D with
   `translateZ`/`rotateX`/`rotateY` under a shared `perspective` on the
   scene, so it reads as a solid box from every angle instead of an open
   corner that shows gaps once rotated far enough. Rotation is driven by
   the cursor (see the pointermove handler below), not a timed loop. */
function Cube3D({ size, tone, style }: { size: number; tone: CubeTone; style?: React.CSSProperties }) {
  const half = size / 2;
  const face = "absolute inset-0 border [backface-visibility:hidden]";
  const tones =
    tone === "volt"
      ? {
          frontBack: "border-volt/70 bg-volt",
          leftRight: "border-volt/50 bg-volt/55",
          topBottom: "border-volt/40 bg-volt/30",
        }
      : {
          frontBack: "border-hairline bg-foreground/5",
          leftRight: "border-hairline bg-foreground/[0.03]",
          topBottom: "border-hairline bg-foreground/10",
        };

  const faces = [
    { tone: tones.frontBack, transform: `translateZ(${half}px)` },
    { tone: tones.frontBack, transform: `rotateY(180deg) translateZ(${half}px)` },
    { tone: tones.leftRight, transform: `rotateY(90deg) translateZ(${half}px)` },
    { tone: tones.leftRight, transform: `rotateY(-90deg) translateZ(${half}px)` },
    { tone: tones.topBottom, transform: `rotateX(90deg) translateZ(${half}px)` },
    { tone: tones.topBottom, transform: `rotateX(-90deg) translateZ(${half}px)` },
  ];

  return (
    <div
      data-cube
      className="absolute"
      style={{ width: size, height: size, transformStyle: "preserve-3d", ...style }}
      aria-hidden="true"
    >
      {faces.map((f, i) => (
        <div key={i} className={`${face} ${f.tone}`} style={{ transform: f.transform }} />
      ))}
    </div>
  );
}

/* Sparse dot field standing in for a schematic backdrop — a single SVG
   pattern, no gradients. */
function DotField({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`absolute inset-0 h-full w-full text-hairline ${className ?? ""}`}>
      <defs>
        <pattern id="notfound-dot-field" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="currentColor" fillOpacity={0.7} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#notfound-dot-field)" />
    </svg>
  );
}

export default function NotFound() {
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const scene = sceneRef.current;
      if (!scene) return;

      const cubes = Array.from(scene.querySelectorAll<HTMLDivElement>("[data-cube]"));

      cubes.forEach((cube, i) => {
        const cfg = CUBES[i];
        if (!cfg) return;
        gsap.set(cube, { rotationX: cfg.rx, rotationY: cfg.ry, transformPerspective: 700 });
      });

      const mm = gsap.matchMedia();

      // Cursor-driven tilt: only on devices with an actual mouse, so touch
      // and reduced-motion users just get each cube's resting pose above.
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const setters = cubes.map((cube, i) => {
          const cfg = CUBES[i];
          return {
            cfg,
            setX: gsap.quickTo(cube, "rotationX", { duration: 0.7, ease: EASE.out }),
            setY: gsap.quickTo(cube, "rotationY", { duration: 0.7, ease: EASE.out }),
          };
        });

        const handlePointerMove = (event: PointerEvent) => {
          const rect = scene.getBoundingClientRect();
          const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
          setters.forEach(({ cfg, setX, setY }) => {
            setX(cfg.rx - ny * 26 * cfg.depth);
            setY(cfg.ry + nx * 34 * cfg.depth);
          });
        };

        const handlePointerLeave = () => {
          setters.forEach(({ cfg, setX, setY }) => {
            setX(cfg.rx);
            setY(cfg.ry);
          });
        };

        scene.addEventListener("pointermove", handlePointerMove);
        scene.addEventListener("pointerleave", handlePointerLeave);
        return () => {
          scene.removeEventListener("pointermove", handlePointerMove);
          scene.removeEventListener("pointerleave", handlePointerLeave);
        };
      });

      const tl = gsap.timeline({ defaults: { ease: EASE.out } });
      tl.from(scene, { opacity: 0, duration: DUR.base })
        .from(cubes, { opacity: 0, scale: 0.4, stagger: STAGGER.items, duration: DUR.base }, "<0.1")
        .from(
          textRef.current ? Array.from(textRef.current.children) : [],
          { opacity: 0, y: 16, stagger: STAGGER.items, duration: DUR.base },
          "-=0.3"
        );

      return () => {
        mm.revert();
        tl.kill();
      };
    },
    { scope: rootRef as React.RefObject<HTMLElement> }
  );

  return (
    <main id="main" className="flex h-svh flex-col overflow-hidden sm:flex-row">
      <div ref={rootRef} className="flex h-full w-full flex-col sm:flex-row">
        <div
          ref={sceneRef}
          className="relative min-h-[140px] w-full flex-1 overflow-hidden border-b border-hairline bg-surface sm:h-full sm:w-0 sm:min-h-0 sm:flex-[3] sm:border-b-0 sm:border-r"
          style={{ perspective: 1100 }}
        >
          <DotField />
          {CUBES.map((cube, i) => (
            <Cube3D key={i} size={cube.size} tone={cube.tone} style={{ top: cube.top, left: cube.left }} />
          ))}
        </div>

        <div
          ref={textRef}
          className="flex w-full shrink-0 flex-col items-start justify-center gap-5 px-6 py-8 sm:h-full sm:w-0 sm:flex-[2] sm:shrink sm:gap-6 sm:px-10 lg:px-14"
        >
          <Logomark className="h-12 w-auto text-foreground sm:h-14" />
          <p className="font-mono text-xs tracking-[0.3em] text-volt sm:text-sm">
            {t.notFound.code}
          </p>
          <h1 className="text-3xl font-semibold uppercase leading-[0.95] tracking-tight sm:text-4xl lg:text-5xl">
            {t.notFound.heading}
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted sm:text-base">
            {t.notFound.body}
          </p>
          <Link
            href="/"
            className="btn-fill mt-2 inline-flex h-12 shrink-0 items-center gap-2 rounded-pill border border-volt px-6 font-mono text-xs uppercase tracking-widest text-volt"
          >
            &larr; {t.notFound.back}
          </Link>
        </div>
      </div>
    </main>
  );
}
