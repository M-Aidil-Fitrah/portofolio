"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sceneState } from "@/lib/sceneState";

const UP = new THREE.Vector3(0, 1, 0);

const TURNS = 2.6;
const HEIGHT = 6.4;
const RADIUS_X = 1.9;
const RADIUS_Z = 1.1;
const RIBBON_WIDTH = 0.85;
const SCATTER_RADIUS = 9;

export const RIBBON_OFFSET_RATIO = 0.3;
export const RIBBON_OFFSET_MAX = 4.4;

/** The x-offset that anchors the sculpture beside the hero headline —
 * shared with the camera rig so the dolly-through lines up with where the
 * ribbon actually sits. */
export function getRibbonOffsetX(viewportWidth: number): number {
  return Math.min(viewportWidth * RIBBON_OFFSET_RATIO, RIBBON_OFFSET_MAX);
}

function curveAt(u: number, out = new THREE.Vector3()): THREE.Vector3 {
  const angle = u * TURNS * Math.PI * 2;
  const taper = 0.55 + 0.45 * Math.sin(u * Math.PI);
  return out.set(
    Math.sin(angle * 0.9) * RADIUS_X * taper,
    (u - 0.5) * HEIGHT,
    Math.cos(angle * 1.15) * RADIUS_Z * taper
  );
}

/** Deterministic pseudo-random in [0, 1) — pure function of `seed`, so it's
 * safe to call during render (unlike Math.random). */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function tangentAt(u: number): THREE.Vector3 {
  const e = 0.001;
  const a = curveAt(Math.max(0, u - e));
  const b = curveAt(Math.min(1, u + e));
  return b.sub(a).normalize();
}

function smoothstep01(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Interpolates across three keyframes (hero / pass-through / settled)
 * instead of a plain lerp, so the mid-scroll "wow" moment can overshoot. */
function keyframeLerp(t: number, a: number, b: number, c: number): number {
  if (t <= 0.5) return THREE.MathUtils.lerp(a, b, smoothstep01(t / 0.5));
  return THREE.MathUtils.lerp(b, c, smoothstep01((t - 0.5) / 0.5));
}

// Ashima/Stefan Gustavson 3D simplex noise — standard, widely reused GLSL noise.
const NOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  vec3 curlPotential(vec3 p) {
    return vec3(
      snoise(p),
      snoise(p + vec3(31.7, 5.2, 11.3)),
      snoise(p + vec3(-17.4, 23.1, 71.9))
    );
  }

  // Divergence-free-ish flow field via finite-difference curl of a 3-channel
  // noise potential — gives organic motion without a visible "outward" drift.
  vec3 curlNoise(vec3 p) {
    float e = 0.15;
    vec3 p0 = curlPotential(p);
    vec3 px = curlPotential(p + vec3(e, 0.0, 0.0));
    vec3 py = curlPotential(p + vec3(0.0, e, 0.0));
    vec3 pz = curlPotential(p + vec3(0.0, 0.0, e));

    float x = (pz.y - p0.y) - (py.z - p0.z);
    float y = (px.z - p0.z) - (pz.x - p0.x);
    float z = (py.x - p0.x) - (px.y - p0.y);

    return vec3(x, y, z) / e;
  }
`;

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uAssemble;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uNoiseFreq;
  uniform float uNoiseAmp;
  uniform float uSpread;
  uniform float uSizeMul;

  attribute vec3 aWidthDir;
  attribute float aWidthAmt;
  attribute vec3 aScatter;
  attribute float aRandom;
  attribute float aU;

  varying float vDisplacement;
  varying float vSweep;

  ${NOISE_GLSL}

  void main() {
    vec3 curvePos = position + aWidthDir * aWidthAmt * uSpread;
    vec3 flow = curlNoise(curvePos * uNoiseFreq + vec3(0.0, 0.0, uTime * 0.05)) * uNoiseAmp;
    vec3 flowed = curvePos + flow;

    float threshold = aRandom * 0.4;
    float t = smoothstep(threshold, threshold + 0.6, uAssemble);
    vec3 pos = mix(aScatter, flowed, t);

    vec2 toMouse = pos.xy - uMouse;
    float d = length(toMouse);
    float repel = smoothstep(1.6, 0.0, d) * uMouseStrength * t;
    pos.xy += normalize(toMouse + 1e-4) * repel * 0.6;

    vDisplacement = clamp(length(flow) * 0.9, 0.0, 1.0);

    float phase = fract(aU - uTime * 0.07);
    vSweep = smoothstep(0.06, 0.0, abs(phase - 0.5)) * t;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (1.6 + aRandom * 2.2) * uSizeMul * (280.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  uniform float uOpacity;

  varying float vDisplacement;
  varying float vSweep;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    vec3 base = vec3(0.42, 0.42, 0.39);
    vec3 volt = vec3(0.851, 1.0, 0.239);
    vec3 color = mix(base, volt, clamp(vDisplacement + vSweep * 0.9, 0.0, 1.0));

    float alpha = smoothstep(0.5, 0.05, d) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

interface RibbonSculptureProps {
  count?: number;
  interactive?: boolean;
}

/**
 * The recurring 3D motif for the landing page: a curl-noise ribbon that
 * scatters as chaos, assembles into a flowing curve (driven by
 * `sceneState.assemble`), then loosens and dims as the page scrolls from
 * hero into About (driven by `sceneState.scroll`). See SceneRoot for the
 * camera choreography that turns this into a single continuous shot.
 */
export function RibbonSculpture({
  count = 42000,
  interactive = true,
}: RibbonSculptureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const geometry = useMemo(() => {
    const cols = Math.max(8, Math.round(Math.sqrt(count * 5)));
    const rows = Math.max(2, Math.round(count / cols));
    const total = cols * rows;

    const positions = new Float32Array(total * 3);
    const widthDir = new Float32Array(total * 3);
    const widthAmt = new Float32Array(total);
    const scatter = new Float32Array(total * 3);
    const randoms = new Float32Array(total);
    const us = new Float32Array(total);

    const center = new THREE.Vector3();
    let i = 0;
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      curveAt(u, center);
      const tangent = tangentAt(u);
      const bDir = new THREE.Vector3().crossVectors(tangent, UP);
      if (bDir.lengthSq() < 1e-6) bDir.set(1, 0, 0);
      bDir.normalize();

      for (let r = 0; r < rows; r++) {
        const v = rows === 1 ? 0 : r / (rows - 1) - 0.5;

        positions[i * 3] = center.x;
        positions[i * 3 + 1] = center.y;
        positions[i * 3 + 2] = center.z;

        widthDir[i * 3] = bDir.x;
        widthDir[i * 3 + 1] = bDir.y;
        widthDir[i * 3 + 2] = bDir.z;

        widthAmt[i] =
          (v + (pseudoRandom(i * 7.13 + 1.7) - 0.5) * 0.12) * RIBBON_WIDTH;
        us[i] = u;

        const theta = pseudoRandom(i * 3.71 + 11.3) * Math.PI * 2;
        const phi = Math.acos(2 * pseudoRandom(i * 5.19 + 23.7) - 1);
        const r3 = SCATTER_RADIUS * Math.cbrt(pseudoRandom(i * 9.37 + 41.1));
        scatter[i * 3] = r3 * Math.sin(phi) * Math.cos(theta);
        scatter[i * 3 + 1] = r3 * Math.sin(phi) * Math.sin(theta) * 0.7;
        scatter[i * 3 + 2] = r3 * Math.cos(phi) * 0.8 - 2;

        randoms[i] = pseudoRandom(i * 2.03 + 5.5);
        i++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aWidthDir", new THREE.BufferAttribute(widthDir, 3));
    geo.setAttribute("aWidthAmt", new THREE.BufferAttribute(widthAmt, 1));
    geo.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));
    geo.setAttribute("aU", new THREE.BufferAttribute(us, 1));
    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAssemble: { value: sceneState.assemble },
      uMouse: { value: new THREE.Vector2(999, 999) },
      uMouseStrength: { value: interactive ? 1 : 0 },
      uNoiseFreq: { value: 0.45 },
      uNoiseAmp: { value: 0.5 },
      uSpread: { value: 1 },
      uOpacity: { value: 0.92 },
      uSizeMul: { value: 1 },
    }),
    [interactive]
  );

  const offsetX = getRibbonOffsetX(viewport.width);

  useFrame((state, delta) => {
    const material = materialRef.current;
    const group = groupRef.current;
    if (!material || !group) return;

    const u = material.uniforms;
    u.uTime.value += delta;
    u.uAssemble.value = sceneState.assemble;

    const scroll = sceneState.scroll;
    u.uNoiseAmp.value = keyframeLerp(scroll, 0.5, 1.35, 0.35);
    u.uSpread.value = keyframeLerp(scroll, 1, 1.6, 2.2);
    u.uOpacity.value = keyframeLerp(scroll, 0.92, 1, 0.32);
    u.uSizeMul.value = keyframeLerp(scroll, 1, 1.3, 0.75);

    group.rotation.y =
      -0.4 + scroll * 0.9 + Math.sin(state.clock.elapsedTime * 0.05) * 0.04;
    group.position.x = THREE.MathUtils.lerp(
      offsetX,
      -offsetX * 0.5,
      smoothstep01((scroll - 0.55) / 0.45)
    );
    group.position.y = 0.2 - scroll * 0.6;

    if (interactive) {
      const mouseWorld = new THREE.Vector2(
        state.pointer.x * (viewport.width / 2),
        state.pointer.y * (viewport.height / 2)
      );
      const localMouse = u.uMouse.value as THREE.Vector2;
      localMouse.lerp(
        new THREE.Vector2(
          mouseWorld.x - group.position.x,
          mouseWorld.y - group.position.y
        ),
        0.08
      );
    }
  });

  return (
    <group ref={groupRef} position={[offsetX, 0.2, -1.2]} scale={1.35}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
