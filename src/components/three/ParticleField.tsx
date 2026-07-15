"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  attribute float aRandom;

  varying float vDisplacement;

  void main() {
    vec3 pos = position;

    float wave = sin(pos.x * 0.5 + uTime * 0.6) * 0.25
               + sin(pos.y * 0.4 - uTime * 0.4) * 0.2
               + sin((pos.x + pos.y) * 0.3 + uTime * 0.8) * 0.15;

    float dist = distance(pos.xy, uMouse);
    float repel = smoothstep(2.5, 0.0, dist) * 1.4;

    pos.z += wave + repel;

    vDisplacement = clamp(abs(wave) * 0.7 + repel, 0.0, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (2.6 + aRandom * 2.2) * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  varying float vDisplacement;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    vec3 base = vec3(0.42, 0.42, 0.39);
    vec3 volt = vec3(0.851, 1.0, 0.239);
    vec3 color = mix(base, volt, vDisplacement);

    float alpha = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Deterministic pseudo-random in [0, 1) — pure function of `seed`, so it's
 * safe to call during render (unlike Math.random). */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface ParticleFieldProps {
  count?: number;
  interactive?: boolean;
}

export function ParticleField({
  count = 9000,
  interactive = true,
}: ParticleFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  const geometry = useMemo(() => {
    const cols = Math.round(Math.sqrt(count * (viewport.width / viewport.height || 1.6)));
    const rows = Math.round(count / cols);
    const positions = new Float32Array(cols * rows * 3);
    const randoms = new Float32Array(cols * rows);

    const spreadX = 16;
    const spreadY = 10;
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = (x / (cols - 1) - 0.5) * spreadX;
        const py = (y / (rows - 1) - 0.5) * spreadY;
        positions[i * 3] = px;
        positions[i * 3 + 1] = py;
        positions[i * 3 + 2] = 0;
        randoms[i] = pseudoRandom(i);
        i++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));
    return geo;
  }, [count, viewport.width, viewport.height]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(999, 999) },
    }),
    []
  );

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;

      if (interactive) {
        const target = new THREE.Vector2(
          state.pointer.x * (viewport.width / 2.4),
          state.pointer.y * (viewport.height / 2.4)
        );
        const mouse = materialRef.current.uniforms.uMouse.value as THREE.Vector2;
        mouse.lerp(target, 0.06);
      }
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.02) * 0.02;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} rotation={[-0.35, 0, 0]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
