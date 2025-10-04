// src/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import PlanetGlobe from "@/components/PlanetGlobe";

export default function HomePage() {
  const router = useRouter();

  const handlePlanetClick = (planet: string) => {
    router.push(`/${planet}`);
  };

  return (
    <div className="landing">
      <div className="title">Embiggen Your Eyes!</div>
      <div className="subtitle">Explore billion-pixel worlds from NASA</div>

      <div
        onClick={() => handlePlanetClick("mars")}
        style={{ outline: "none" }}
      >
        <PlanetGlobe texture="/mars.jpg" name="Mars" />
      </div>

      <div
        onClick={() => handlePlanetClick("moon")}
        style={{ outline: "none" }}
      >
        <PlanetGlobe texture="/moon.jpg" name="Moon" />
      </div>

      <div
        onClick={() => handlePlanetClick("mercury")}
        style={{ outline: "none" }}
      >
        <PlanetGlobe texture="/mercury.jpg" name="Mercury" />
      </div>
    </div>
  );
}
