"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { ParticleField } from "@/components/three/ParticleField";
import { HeroObject } from "@/components/three/HeroObject";

export function HeroScene() {
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCoarsePointer =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFrameloop(entry.isIntersecting ? "always" : "never"),
      { threshold: 0 }
    );
    observer.observe(el);

    const handleVisibility = () => {
      setFrameloop(document.hidden ? "never" : "always");
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      aria-hidden="true"
      role="presentation"
    >
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        camera={{ position: [0, 0, 8], fov: 45 }}
        frameloop={frameloop}
        onCreated={() => setReady(true)}
        className={`!absolute inset-0 transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <ParticleField
          count={isCoarsePointer ? 4000 : 9000}
          interactive={!isCoarsePointer}
        />
        <HeroObject interactive={!isCoarsePointer} />
      </Canvas>
    </div>
  );
}
