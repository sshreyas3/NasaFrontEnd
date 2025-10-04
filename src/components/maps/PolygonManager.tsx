// src/components/maps/PolygonManager.tsx
"use client";

import { useEffect, useState } from "react";
import L, { LatLng } from "leaflet";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import { usePolygonCRUD } from "./usePolygonCRUD";
import styles from "./PolygonManager.module.scss";

interface PolygonManagerProps {
  map: L.Map;
  planet: string;
  userId: string;
  isDrawing: boolean;
  onDrawingComplete: () => void;
}

export function PolygonManager({
  map,
  planet,
  userId,
  isDrawing,
  onDrawingComplete,
}: PolygonManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [coords, setCoords] = useState<[number, number][]>([]);
  const { polygons, createPolygon, refetch } = usePolygonCRUD(planet, userId);

  // Enable/disable drawing
  useEffect(() => {
    if (!map) return;

    if (isDrawing) {
      map.pm.enableDraw("Polygon", {
        snappable: true,
        cursorMarker: true,
        allowSelfIntersection: false,
      });
    } else {
      map.pm.disableDraw("Polygon");
    }

    const handleCreate = (e: any) => {
      const layer = e.layer as L.Polygon;
      const latLngs = (layer.getLatLngs()[0] as LatLng[]).map(
        (ll) => [ll.lat, ll.lng] as [number, number]
      );

      setCoords(latLngs);
      setShowForm(true);
      onDrawingComplete();

      layer.on("remove", () => {
        setShowForm(false);
      });
    };

    if (isDrawing) {
      map.on("pm:create", handleCreate);
    }

    return () => {
      map.off("pm:create", handleCreate);
    };
  }, [map, isDrawing, onDrawingComplete]);

  const handleSaveLabel = async (label: string) => {
    if (!label.trim()) return;
    await createPolygon(label, coords);
    setShowForm(false);
    refetch();
  };

  const handleCancel = () => {
    setShowForm(false);
    onDrawingComplete();
  };

  // Render saved polygons
  useEffect(() => {
    if (!map) return;

    const existing = (map as any)._polygonLayers || [];
    existing.forEach((layer: L.Layer) => map.removeLayer(layer));
    const newLayers: L.Layer[] = [];

    polygons.forEach((poly) => {
      const leafletPoly = L.polygon(poly.coordinates, {
        color: "#3b82f6",
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(map);

      const bounds = leafletPoly.getBounds();
      const center = bounds.getCenter();
      const label = L.marker(center, {
        icon: L.divIcon({
          className: "polygon-label",
          html: `<div class="polygon-label-text">${poly.label}</div>`,
          iconSize: [100, 20],
        }),
      }).addTo(map);

      newLayers.push(leafletPoly, label);
    });

    (map as any)._polygonLayers = newLayers;
  }, [map, polygons]);

  return (
    <>
      {showForm && (
        <div className={styles.formContainer}>
          <input
            type="text"
            placeholder="Area name"
            className={styles.inputField}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                handleSaveLabel((e.target as HTMLInputElement).value);
            }}
            autoFocus
          />
          <div className={styles.buttonGroup}>
            <button
              onClick={(e) => {
                const input = e.currentTarget
                  .previousElementSibling as HTMLInputElement;
                handleSaveLabel(input.value);
              }}
              className={styles.saveButton}
            >
              Save
            </button>
            <button onClick={handleCancel} className={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .polygon-label-text {
          background: rgba(142, 35, 35, 0.9);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
