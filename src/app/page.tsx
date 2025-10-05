// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PlanetGlobe from "@/components/PlanetGlobe";

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const uid =
      typeof window !== "undefined" ? sessionStorage.getItem("userId") : null;
    setIsLoggedIn(!!uid);
  }, []);

  const handlePlanetClick = (planet: string) => {
    router.push(`/${planet}`);
  };

  const handleLogin = () => {
    router.push(`/auth`);
  };

  return (
    <>
      <div className="landing">
        <div className="stars"></div>
        <div className="stars-layer-2"></div>
        <div className="top-bar glass">
          <div className="logo-section">
            <span className="logo-icon">🌌</span>
            <span className="logo-text">Cosmic Lens</span>
          </div>
          {!isLoggedIn && (
            <button className="login-btn glass-btn" onClick={handleLogin}>
              <span>🚀</span>
              <span>Login</span>
            </button>
          )}
        </div>

        <div className="hero-section">
          <h1 className="title">Embiggen Your Eyes!</h1>
          <p className="subtitle">Explore Billion-pixel worlds from NASA</p>
        </div>

        <div className="planets-grid">
          <div
            className="planet-wrapper"
            onClick={() => handlePlanetClick("mars")}
          >
            <PlanetGlobe texture="/mars.jpg" name="Mars" />
            <div className="planet-info glass">
              <h3>Mars</h3>
              <p>The Red Planet</p>
            </div>
          </div>

          <div
            className="planet-wrapper"
            onClick={() => handlePlanetClick("moon")}
          >
            <PlanetGlobe texture="/moon.jpg" name="Moon" />
            <div className="planet-info glass">
              <h3>Moon</h3>
              <p>Earths Satellite</p>
            </div>
          </div>

          <div
            className="planet-wrapper"
            onClick={() => handlePlanetClick("mercury")}
          >
            <PlanetGlobe texture="/mercury.jpg" name="Mercury" />
            <div className="planet-info glass">
              <h3>Mercury</h3>
              <p>Closest to the Sun</p>
            </div>
          </div>
        </div>

        <div className="footer glass">
          <p>Powered by NASA Imagery • Collaborative Exploration</p>
        </div>
      </div>
    </>
  );
}
