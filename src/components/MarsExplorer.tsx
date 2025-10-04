// src/components/MarsExplorer.tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Stars } from "@react-three/drei";
import * as THREE from "three";
import { fetchTileUrls } from "@/lib/api";
import { stitchTilesToImage } from "@/lib/stitchTiles";

const BASE_MARS_URL = "https://threejs.org/examples/textures/planets/mars.jpg";

function MarsSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [highResTexture, setHighResTexture] = useState<THREE.Texture | null>(
    null
  );
  const { camera } = useThree();
  const lastZoom = useRef(0);

  // ✅ Pre-load base texture ONCE with correct color space
  const baseTexture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(BASE_MARS_URL);
    tex.colorSpace = THREE.SRGBColorSpace; // 🔑 Critical for visibility
    return tex;
  }, []);

  const getLatLonFromCamera = (): { lat: number; lon: number } | null => {
    if (!meshRef.current) return null;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const raycaster = new THREE.Raycaster(camera.position, direction);
    const intersects = raycaster.intersectObject(meshRef.current);
    if (intersects.length === 0) return null;

    const point = intersects[0].point;
    const phi = Math.acos(point.y); // Mars radius = 1
    const theta = Math.atan2(point.x, point.z);
    const lat = 90 - (phi * 180) / Math.PI;
    const lon = (theta * 180) / Math.PI;
    return { lat, lon };
  };

  useFrame(() => {
    const distance = camera.position.length();
    const zoomLevel = Math.max(0, Math.floor(5 - distance));

    if (Math.abs(zoomLevel - lastZoom.current) >= 1 && zoomLevel >= 3) {
      lastZoom.current = zoomLevel;
      const coords = getLatLonFromCamera();
      if (coords) {
        fetchTileUrls(coords.lat, coords.lon, zoomLevel)
          .then(async (data) => {
            const imageDataUrl = await stitchTilesToImage(
              data.tiles,
              data.matrixWidth,
              data.matrixHeight,
              data.tileSize
            );
            const loader = new THREE.TextureLoader();
            loader.load(imageDataUrl, (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              setHighResTexture(texture);
            });
          })
          .catch(console.warn);
      }
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <meshStandardMaterial
        map={highResTexture || baseTexture} // ✅ Now uses pre-loaded texture
        roughness={0.8}
        metalness={0.2}
      />
    </Sphere>
  );
}

export default function MarsExplorer() {
  return (
    <div id="mars-explorer">
      <div className="controls">
        <h1>Embiggen Your Eyes! — Mars</h1>
        <p>Zoom in to load NASA tiles</p>
      </div>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} />
        <MarsSurface />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={1.2}
          maxDistance={5}
        />
      </Canvas>
    </div>
  );
}
