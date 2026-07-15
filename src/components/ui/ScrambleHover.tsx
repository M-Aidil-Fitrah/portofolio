"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

interface ScrambleHoverProps {
  text: string;
  className?: string;
}

/** Text that decodes into itself on hover — a signature GSAP move, used
 * sparingly on a handful of links rather than everywhere. */
export function ScrambleHover({ text, className }: ScrambleHoverProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = ref.current;
    const canHover = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!el || !canHover || reduceMotion) return;

    const handleEnter = () => {
      gsap.to(el, {
        duration: 0.5,
        scrambleText: { text, speed: 0.4, chars: "XO+#01" },
        ease: "none",
      });
    };

    el.addEventListener("mouseenter", handleEnter);
    return () => el.removeEventListener("mouseenter", handleEnter);
  }, []);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
