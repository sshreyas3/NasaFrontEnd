// src/components/MarsMapClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import styles from "./mars.module.scss";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue
import L from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapEventHandler({
  onMove,
  onZoom,
  onMouseMove,
  onMouseOut,
}: {
  onMove: () => void;
  onZoom: () => void;
  onMouseMove: (e: any) => void;
  onMouseOut: () => void;
}) {
  useMapEvents({
    moveend: onMove,
    zoomend: onZoom,
    mousemove: onMouseMove,
    mouseout: onMouseOut,
  });
  return null;
}

export default function MarsMapClient() {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [mousePos, setMousePos] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const mapRef = useRef<any>(null);

  const updateMapInfo = () => {
    if (mapRef.current) {
      const map = mapRef.current;
      setZoom(map.getZoom());
      setCenter(map.getCenter());
    }
  };

  const handleMouseMove = (e: any) => {
    setMousePos({ lat: e.latlng.lat, lng: e.latlng.lng });
  };

  const handleMouseOut = () => {
    setMousePos(null);
  };

  const getTileCoords = () => {
    const scale = Math.pow(2, zoom);
    const worldTiles = scale * 2;
    const x = Math.floor(((center.lng + 180) / 360) * worldTiles);
    const y = Math.floor(((90 - center.lat) / 180) * scale);
    return `${x}, ${y}`;
  };

  return (
    <div className={styles.marsContainer}>
      <MapContainer
        ref={mapRef}
        center={[0, 0]}
        zoom={1}
        minZoom={0}
        maxZoom={8}
        maxBounds={[
          [-90, -180],
          [90, 180],
        ]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        style={{ height: "100%", width: "100%" }}
        crs={L.CRS.EPSG4326}
      >
        <TileLayer
          url="http://10.186.81.13:8000/api/tiles/global/{z}/{x}/{y}.jpg"
          attribution="NASA Mars Viking MDIM21"
          noWrap={true}
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          eventHandlers={{
            tileloadstart: (e) =>
              console.log(
                "📡 Loading tile:",
                `${e.coords.z}/${e.coords.x}/${e.coords.y}`
              ),
            tileerror: (e) =>
              console.error(
                "❌ Tile error:",
                `${e.coords.z}/${e.coords.x}/${e.coords.y}`
              ),
            tileload: (e) =>
              console.log(
                "✅ Tile loaded:",
                `${e.coords.z}/${e.coords.x}/${e.coords.y}`
              ),
          }}
        />
        <MapEventHandler
          onMove={updateMapInfo}
          onZoom={updateMapInfo}
          onMouseMove={handleMouseMove}
          onMouseOut={handleMouseOut}
        />
      </MapContainer>

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
