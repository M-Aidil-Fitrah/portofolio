/**
 * Cross-tree bridge between GSAP/DOM timelines and the R3F scene. GSAP
 * writes plain numbers here; `useFrame` reads them each tick. Keeping this
 * out of React state avoids re-rendering the canvas tree on every scrub tick.
 */
export const sceneState = {
  /** 0 = scattered chaos, 1 = ribbon fully assembled. Driven by the preloader
   * (or a short mount intro when the preloader is skipped). */
  assemble: 0,
  /** 0 = hero framing, 1 = settled in the About viewport. Driven by a
   * ScrollTrigger scrub spanning #top through #about. */
  scroll: 0,
};

type Listener = () => void;

let introDone = false;
const introListeners = new Set<Listener>();

/** Marks the intro (preloader or fallback mount tween) as finished and
 * flushes any callbacks waiting on it — e.g. HeroHeadline's reveal. */
export function markIntroDone() {
  if (introDone) return;
  introDone = true;
  introListeners.forEach((cb) => cb());
  introListeners.clear();
}

/** Subscribes to intro completion; fires immediately if it already happened. */
export function onIntroDone(cb: Listener): () => void {
  if (introDone) {
    cb();
    return () => {};
  }
  introListeners.add(cb);
  return () => introListeners.delete(cb);
}

const PRELOADER_SESSION_KEY = "portfolio-preloader-shown";

/** Single source of truth for "will the preloader run this session" — read
 * by both the Preloader (to decide whether to render) and the scene mount
 * logic (to decide whether to defer or mount immediately). */
export function shouldShowPreloader(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return window.sessionStorage.getItem(PRELOADER_SESSION_KEY) !== "1";
}

export function markPreloaderShown() {
  window.sessionStorage.setItem(PRELOADER_SESSION_KEY, "1");
}
