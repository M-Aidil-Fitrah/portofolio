"use client";

import dynamic from "next/dynamic";

// `next/dynamic` with `ssr: false` is only allowed from a Client Component,
// so this thin wrapper is what page.tsx (a Server Component) actually mounts.
const LandingScene = dynamic(
  () => import("@/components/three/SceneRoot").then((mod) => mod.LandingScene),
  { ssr: false }
);

export { LandingScene as LandingSceneLoader };
