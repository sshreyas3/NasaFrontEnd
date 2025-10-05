// src/components/PlanetGlobe.tsx
"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";

// Realistic rotation speeds (scaled for visibility)
// Based on actual planetary rotation periods
const ROTATION_SPEEDS: Record<string, number> = {
  Mars: 0.0024, // ~24.6 hours (similar to Earth)
  Moon: 0.0001, // ~27.3 days (tidally locked, very slow)
  Mercury: 0.0004, // ~58.6 days (very slow rotation)
};

function RotatingGlobe({ textureUrl, name }: { textureUrl: string; name: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Get rotation speed based on planet name
  const rotationSpeed = ROTATION_SPEEDS[name] || 0.002;

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <meshStandardMaterial
        map={new THREE.TextureLoader().load(textureUrl)}
        roughness={0.9}
        metalness={0.1}
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
    <div className="planet-globe">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        {/* Ambient light for overall illumination */}
        <ambientLight intensity={0.6} />
        
        {/* Main sun light from the side */}
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={1.8} 
          color="#ffffff"
        />
        
        {/* Subtle rim light for depth */}
        <pointLight 
          position={[-5, 0, -3]} 
          intensity={0.4} 
          color="#8888ff" 
        />
        
        {/* Subtle fill light */}
        <pointLight 
          position={[0, -5, 2]} 
          intensity={0.3} 
          color="#ffaa88" 
        />
        
        <RotatingGlobe textureUrl={texture} name={name} />
      </Canvas>
    </div>
  );
}