"use client";

import Lenis from "lenis";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

let lenisInstance: Lenis | null = null;
const listeners = new Set<() => void>();

function getServerSnapshot() {
  return null;
}

function getSnapshot() {
  return lenisInstance;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach((listener) => listener());
}

interface SmoothScrollContextValue {
  lenis: Lenis | null;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  lenis: null,
});

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenis = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const instance = new Lenis({ lerp: 0.1, anchors: true });
    lenisInstance = instance;
    notify();

    instance.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Lenis caches the document's scrollable height for its own scroll
    // limit; nothing tells it to re-measure when GSAP resizes the DOM
    // (e.g. Works' pin-spacer growing to its pinned height). Every call site
    // that does `ScrollTrigger.refresh()` (HashLanding, Works, Preloader)
    // was racing that stale limit — landing on a hash right after refresh
    // could complete before Lenis' own resize detection caught up, capping
    // real scroll short of the page's true end (reported as scroll getting
    // "stuck" partway through the Works/Projects section). Reacting to
    // ScrollTrigger's own `refresh` event keeps the two permanently in sync
    // for every refresh, present and future, instead of patching each
    // call site individually.
    const onRefresh = () => instance.resize();
    ScrollTrigger.addEventListener("refresh", onRefresh);

    return () => {
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      gsap.ticker.remove(tick);
      instance.destroy();
      lenisInstance = null;
      notify();
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={{ lenis }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}
