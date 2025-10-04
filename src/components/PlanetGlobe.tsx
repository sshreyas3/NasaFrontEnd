// src/components/PlanetGlobe.tsx
"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";

function RotatingGlobe({ textureUrl }: { textureUrl: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <meshStandardMaterial
        map={new THREE.TextureLoader().load(textureUrl)}
        roughness={0.8}
        metalness={0.2}
      />
    </Sphere>
  );
}

export default function PlanetGlobe({
  texture,
  name,
}: {
  texture: string;
  name: string;
}) {
  return (
    <div className="planet-card">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <ambientLight intensity={1} />
        <pointLight position={[10, 5, 5]} intensity={1} color="#ffffff" />
        <RotatingGlobe textureUrl={texture} />
      </Canvas>
      <div className="planet-name">{name}</div>
    </div>
  );
}
