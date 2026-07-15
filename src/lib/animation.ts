export const EASE = {
  out: "power4.out",
  inOut: "power3.inOut",
  expo: "expo.out",
  expoInOut: "expo.inOut",
} as const;

export const DUR = {
  fast: 0.5,
  base: 0.9,
  slow: 1.4,
  preloader: 1.8,
  introFallback: 1.4,
} as const;

export const STAGGER = {
  chars: 0.02,
  words: 0.04,
  lines: 0.08,
  items: 0.1,
} as const;

/** Resolves once web fonts have finished loading, so text-measuring
 * animations (SplitText) don't run against mis-measured lines. */
export function fontsReady(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return Promise.resolve();
  }
  return document.fonts.ready.then(() => undefined);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
