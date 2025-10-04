// src/components/maps/PolygonManager.tsx
"use client";

import { useEffect, useState } from "react";
import L, { LatLng } from "leaflet";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import { usePolygonCRUD } from "./usePolygonCRUD";

interface PolygonManagerProps {
  map: L.Map;
  planet: string;
  userId: string;
  isDrawing: boolean; // 🔴 New prop
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

  // 🔴 Enable/disable drawing based on isDrawing prop
  useEffect(() => {
    if (!map) return;

    if (isDrawing) {
      // Enable polygon drawing
      map.pm.enableDraw("Polygon", {
        snappable: true,
        cursorMarker: true,
        allowSelfIntersection: false,
      });
    } else {
      // Disable all drawing
      map.pm.disableDraw("Polygon");
    }

    const handleCreate = (e: any) => {
      const layer = e.layer as L.Polygon;
      const latLngs = (layer.getLatLngs()[0] as LatLng[]).map(
        (ll) => [ll.lat, ll.lng] as [number, number]
      );

      setCoords(latLngs);
      setShowForm(true);
      onDrawingComplete(); // 🔴 Exit drawing mode

      // Optional: auto-remove if canceled
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
    refetch(); // Ensure new polygon appears
  };

  const handleCancel = () => {
    setShowForm(false);
    onDrawingComplete();
    // Geoman auto-removes incomplete layers
  };

  // 🔴 Render saved polygons (same as before)
  useEffect(() => {
    if (!map) return;

    // Clean up previous layers
    const existing = (map as any)._polygonLayers || [];
    existing.forEach((layer: L.Layer) => map.removeLayer(layer));
    const newLayers: L.Layer[] = [];

    polygons.forEach((poly) => {
      const leafletPoly = L.polygon(poly.coordinates, {
        color: "#3b82f6",
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(map);

      // Add label at centroid
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
        <div className="absolute top-16 left-4 z-[1000] bg-white p-4 rounded shadow-lg border">
          <input
            type="text"
            placeholder="Area name"
            className="border p-2 rounded mb-2 w-48"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                handleSaveLabel((e.target as HTMLInputElement).value);
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                const input = e.currentTarget
                  .previousElementSibling as HTMLInputElement;
                handleSaveLabel(input.value);
              }}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 px-3 py-1 rounded text-sm"
            >
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
