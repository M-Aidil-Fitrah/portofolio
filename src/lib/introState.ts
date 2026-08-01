/** Pub/sub shared between the Preloader and the entrances that wait on it. */

type Listener = () => void;

let introDone = false;
const introListeners = new Set<Listener>();

/** Marks the intro finished and flushes any callbacks waiting on it. */
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

/** Single source of truth for "will the preloader run this session." */
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
