// src/app/mars/MarsMapClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PolygonManager } from "@/components/maps/PolygonManager";
import styles from "./mars.module.scss";

export default function MarsMapClient() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [userId] = useState("user_123");
  const [isDrawing, setIsDrawing] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [mousePos, setMousePos] = useState<{ lat: number; lng: number } | null>(
    null
  );

  useEffect(() => {
    if (!mapRef.current) return;

    const leafletMap = L.map(mapRef.current, {
      center: [0, 0],
      zoom: 1,
      minZoom: 0,
      maxZoom: 8,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      crs: L.CRS.EPSG4326,
      worldCopyJump: false,
    });

    L.tileLayer("http://localhost:8000/api/tiles/global/{z}/{x}/{y}.jpg", {
      attribution: "NASA Mars Viking MDIM21",
      noWrap: true,
      errorTileUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    }).addTo(leafletMap);

    const updateMapInfo = () => {
      setZoom(leafletMap.getZoom());
      setCenter(leafletMap.getCenter());
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      setMousePos({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    const handleMouseOut = () => {
      setMousePos(null);
    };

    leafletMap.on("moveend zoomend", updateMapInfo);
    leafletMap.on("mousemove", handleMouseMove);
    leafletMap.on("mouseout", handleMouseOut);

    setMap(leafletMap);
    updateMapInfo();

    return () => {
      leafletMap.off("moveend zoomend", updateMapInfo);
      leafletMap.off("mousemove", handleMouseMove);
      leafletMap.off("mouseout", handleMouseOut);
      leafletMap.remove();
    };
  }, []);

  const getTileCoords = () => {
    const scale = Math.pow(2, zoom);
    const worldTiles = scale * 2;
    const x = Math.floor(((center.lng + 180) / 360) * worldTiles);
    const y = Math.floor(((90 - center.lat) / 180) * scale);
    return `${x}, ${y}`;
  };

  return (
    <div className={`${styles.marsContainer} relative w-full h-screen`}>
      <button
        disabled={isDrawing}
        onClick={() => !isDrawing && setIsDrawing(true)}
        className={`absolute top-4 left-4 z-[1000] p-2 rounded shadow ${
          isDrawing
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isDrawing ? "✏️ Drawing..." : "✏️ Draw Area"}
      </button>

      {/* ✅ Map container with fixed height */}
      <div
        ref={mapRef}
        className="absolute inset-0 z-0"
        style={{ height: "100vh", width: "100%" }}
      />

      {map && (
        <PolygonManager
          map={map}
          planet="mars"
          userId={userId}
          isDrawing={isDrawing}
          onDrawingComplete={() => setIsDrawing(false)}
        />
      )}

      <div className={styles.infoPanel}>
        <h3>🔴 Mars Explorer</h3>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Zoom:</span>
          <span className={styles.infoValue}>{zoom}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Lat:</span>
          <span className={styles.infoValue}>{center.lat.toFixed(2)}°</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Lon:</span>
          <span className={styles.infoValue}>{center.lng.toFixed(2)}°</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Tile (x,y):</span>
          <span className={styles.infoValue}>{getTileCoords()}</span>
        </div>
        <hr style={{ border: "1px solid #ff9966", margin: "10px 0" }} />
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Mouse Lat:</span>
          <span className={styles.infoValue}>
            {mousePos ? mousePos.lat.toFixed(4) + "°" : "-"}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Mouse Lon:</span>
          <span className={styles.infoValue}>
            {mousePos ? mousePos.lng.toFixed(4) + "°" : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
