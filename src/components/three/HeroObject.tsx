"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface HeroObjectProps {
  interactive?: boolean;
}

/** A large volt-edged wireframe icosahedron anchored beside the headline —
 * the deliberate, unmissable "there is 3D here" centerpiece, as opposed to
 * the ambient particle field which reads more like atmosphere. */
export function HeroObject({ interactive = true }: HeroObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const edges = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    return new THREE.EdgesGeometry(geo);
  }, []);

  const innerEdges = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.55, 0);
    return new THREE.EdgesGeometry(geo);
  }, []);

  const offsetX = Math.min(viewport.width * 0.28, 4.2);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    group.rotation.y = state.clock.elapsedTime * 0.15;
    group.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.3 + 0.15;

    if (interactive) {
      const targetTilt = state.pointer.y * 0.2;
      const targetSpin = state.pointer.x * 0.2;
      group.rotation.x += targetTilt * 0.3;
      group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, targetSpin, 0.05);
    }
  });

  return (
    <group ref={groupRef} position={[offsetX, 0.2, -1]} scale={1.7}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#d9ff3d" transparent opacity={0.9} />
      </lineSegments>
      <lineSegments geometry={innerEdges} rotation={[0.4, 0.4, 0]}>
        <lineBasicMaterial color="#d9ff3d" transparent opacity={0.35} />
      </lineSegments>
    </group>
  );
}
