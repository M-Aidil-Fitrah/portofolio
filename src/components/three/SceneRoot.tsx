"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DUR } from "@/lib/animation";
import {
  markIntroDone,
  sceneState,
  shouldShowPreloader,
} from "@/lib/sceneState";
import {
  RibbonSculpture,
  getRibbonOffsetX,
} from "@/components/three/RibbonSculpture";

function smoothstep01(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function keyframeLerp(t: number, a: number, b: number, c: number): number {
  if (t <= 0.5) return THREE.MathUtils.lerp(a, b, smoothstep01(t / 0.5));
  return THREE.MathUtils.lerp(b, c, smoothstep01((t - 0.5) / 0.5));
}

/** Dollies the camera from the hero framing, through the ribbon at the
 * mid-scroll "pass-through" moment, out to a calmer wide shot for About —
 * driven purely by `sceneState.scroll` (no React state). */
function CameraDolly() {
  useFrame((state) => {
    const { camera, viewport } = state;
    const offsetX = getRibbonOffsetX(viewport.width);
    const scroll = sceneState.scroll;
    camera.position.x = keyframeLerp(scroll, 0, offsetX * 0.5, -1.8);
    camera.position.y = keyframeLerp(scroll, 0, 0.15, -0.4);
    camera.position.z = keyframeLerp(scroll, 8, 1.6, 6.5);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

interface SceneCanvasProps {
  interactive: boolean;
  count: number;
}

function SceneCanvas({ interactive, count }: SceneCanvasProps) {
  // Tracked separately from tab visibility: this is what also gates opacity,
  // so the (fixed, full-viewport) canvas fully disappears — rather than just
  // freezing its last frame — once scrolled past About and can't bleed
  // through the un-positioned sections that follow.
  const [inRange, setInRange] = useState(true);
  const [tabHidden, setTabHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const targets = ["#top", "#about"]
      .map((selector) => document.querySelector(selector))
      .filter((el): el is Element => Boolean(el));
    if (targets.length === 0) return;

    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });
        setInRange(visible.size > 0);
      },
      { threshold: 0 }
    );
    targets.forEach((el) => observer.observe(el));

    const handleVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      camera={{ position: [0, 0, 8], fov: 45 }}
      frameloop={inRange && !tabHidden ? "always" : "never"}
      onCreated={() => setReady(true)}
      className={`!absolute inset-0 transition-opacity duration-700 ${
        ready && inRange ? "opacity-100" : "opacity-0"
      }`}
    >
      <RibbonSculpture count={count} interactive={interactive} />
      <CameraDolly />
    </Canvas>
  );
}

/**
 * Mounts the single site-wide `<Canvas>` as a fixed background spanning
 * the hero and about sections, and wires the DOM-driven ScrollTrigger
 * scrub that writes `sceneState.scroll` for the camera/shader to read.
 * When no preloader will run (revisit, or reduced-motion already ruled
 * out mounting entirely), it also plays the short fallback assemble tween
 * that the Preloader would otherwise own.
 */
export function LandingScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const isCoarsePointer =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (shouldShowPreloader()) {
      // Deferred a tick (rather than set synchronously) so the mount isn't
      // a same-effect cascading render — the preloader curtain covers this
      // either way, so the delay is imperceptible.
      const id = window.setTimeout(() => setMounted(true), 0);
      return () => window.clearTimeout(id);
    }

    const requestIdle =
      window.requestIdleCallback ??
      ((cb: IdleRequestCallback) =>
        window.setTimeout(() => cb({} as IdleDeadline), 300));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;

    const id = requestIdle(() => setMounted(true));
    return () => cancelIdle(id);
  }, []);

  useGSAP(
    () => {
      if (!mounted) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const trigger = ScrollTrigger.create({
          trigger: "#top",
          start: "top top",
          endTrigger: "#about",
          end: "bottom bottom",
          scrub: 0.8,
          onUpdate: (self) => {
            sceneState.scroll = self.progress;
          },
        });

        if (!shouldShowPreloader()) {
          gsap.to(sceneState, {
            assemble: 1,
            duration: DUR.introFallback,
            ease: "power2.out",
            onComplete: markIntroDone,
          });
        }

        return () => trigger.kill();
      });

      return () => mm.revert();
    },
    {
      scope: containerRef as React.RefObject<HTMLElement>,
      dependencies: [mounted],
    }
  );

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
      role="presentation"
    >
      {mounted && (
        <SceneCanvas
          count={isCoarsePointer ? 16000 : 42000}
          interactive={!isCoarsePointer}
        />
      )}
    </div>
  );
}
