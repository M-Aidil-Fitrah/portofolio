"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { usePreview } from "@/components/providers/PreviewProvider";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import type { Project } from "@/lib/projects";

const PLACEHOLDER_COUNT = 4;

/**
 * Horizontal gallery strip for the case study. Deliberately a native
 * overflow-x scroller with snap points (not a GSAP scroll hijack): it works
 * identically with touch, trackpad, and drag, needs no reduced-motion
 * branch for its core behavior, and never fights Lenis for the vertical
 * axis. GSAP only adds the entrance stagger and fine-pointer drag-to-scroll
 * on top. Frames fall back to designed placeholders (same language as
 * ProjectCover) until real screenshots land in `project.gallery`.
 */
export function ProjectGallery({ project }: { project: Project }) {
  const { t } = useLocale();
  const { openPreview } = usePreview();
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  // Distinguishes a click from the tail end of a mouse drag — a drag that
  // travelled further than a few px must not pop the preview open.
  const dragDistRef = useRef(0);
  const [active, setActive] = useState(0);

  const frames =
    project.gallery && project.gallery.length > 0
      ? project.gallery
      : Array.from({ length: PLACEHOLDER_COUNT }, () => null);

  useGSAP(
    () => {
      const strip = stripRef.current;
      if (!strip) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.from(strip.children, {
          x: 80,
          opacity: 0,
          duration: DUR.base,
          ease: EASE.expo,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: strip, start: "top 85%", toggleActions: "play none none reverse" },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      // Drag-to-scroll for fine pointers. Native wheel/touch scrolling is
      // untouched — this only adds mouse dragging, which the snap points
      // then settle. Guarded to mouse input so touch keeps its native
      // momentum instead of double-handling.
      mm.add("(pointer: fine)", () => {
        let dragging = false;
        let startX = 0;
        let startScroll = 0;

        const down = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          dragging = true;
          dragDistRef.current = 0;
          startX = e.clientX;
          startScroll = strip.scrollLeft;
          strip.setPointerCapture(e.pointerId);
          strip.style.scrollSnapType = "none";
        };
        const moveDrag = (e: PointerEvent) => {
          if (!dragging) return;
          dragDistRef.current = Math.max(
            dragDistRef.current,
            Math.abs(e.clientX - startX)
          );
          strip.scrollLeft = startScroll - (e.clientX - startX);
        };
        const up = () => {
          dragging = false;
          strip.style.scrollSnapType = "";
        };

        strip.addEventListener("pointerdown", down);
        strip.addEventListener("pointermove", moveDrag);
        strip.addEventListener("pointerup", up);
        strip.addEventListener("pointercancel", up);
        return () => {
          strip.removeEventListener("pointerdown", down);
          strip.removeEventListener("pointermove", moveDrag);
          strip.removeEventListener("pointerup", up);
          strip.removeEventListener("pointercancel", up);
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef as React.RefObject<HTMLElement>, dependencies: [project.slug] }
  );

  const handleScroll = () => {
    const strip = stripRef.current;
    if (!strip || !strip.children.length) return;
    const frameWidth = strip.scrollWidth / strip.children.length;
    setActive(
      Math.min(frames.length - 1, Math.round(strip.scrollLeft / frameWidth))
    );
  };

  return (
    <div ref={rootRef} className="border-t border-hairline py-20">
      <div className="flex items-baseline justify-between px-6 sm:px-10">
        <div className="mx-auto flex w-full max-w-[1600px] items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.project.gallery}
          </h2>
          <span className="font-mono text-xs tabular-nums tracking-widest text-muted">
            <span className="text-volt">
              {String(active + 1).padStart(2, "0")}
            </span>{" "}
            / {String(frames.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div
        ref={stripRef}
        data-cursor={t.project.galleryDrag}
        onScroll={handleScroll}
        className="mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 [scrollbar-width:none] sm:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {frames.map((src, i) => (
          <figure
            key={src ?? i}
            role="button"
            tabIndex={0}
            data-cursor={t.preview.open}
            aria-label={`${project.title} — ${t.project.gallery} ${i + 1} (${t.preview.open})`}
            onClick={() => {
              if (dragDistRef.current > 6) return;
              openPreview({
                src: src ?? undefined,
                alt: `${project.title} — ${t.project.gallery} ${i + 1}`,
                caption: `${project.title} — ${String(i + 1).padStart(2, "0")}`,
                index: String(i + 1).padStart(2, "0"),
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                (e.currentTarget as HTMLElement).click();
              }
            }}
            className="relative flex aspect-[16/10] w-[85%] shrink-0 cursor-pointer snap-center items-center justify-center overflow-hidden rounded-card border border-hairline bg-surface select-none sm:w-[60%] lg:w-[45%]"
          >
            {src ? (
              <Image
                src={src}
                alt={`${project.title} — ${t.project.gallery} ${i + 1}`}
                fill
                sizes="(max-width: 640px) 85vw, (max-width: 1024px) 60vw, 45vw"
                className="pointer-events-none object-cover"
                draggable={false}
              />
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none font-mono text-[10vw] leading-none text-hairline sm:text-[6vw]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <figcaption className="absolute bottom-5 left-5 font-mono text-xs uppercase tracking-widest text-muted">
                  {project.title} — {String(i + 1).padStart(2, "0")}
                </figcaption>
              </>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
