// src/components/maps/PolygonDrawer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

interface PolygonDrawerProps {
  map: L.Map;
  onPolygonSaved: (label: string, coordinates: [number, number][]) => void;
}

export default function PolygonDrawer({
  map,
  onPolygonSaved,
}: PolygonDrawerProps) {
  const drawControlRef = useRef<L.Control | null>(null);
  const isDrawingRef = useRef(false);
  const [isControlAdded, setIsControlAdded] = useState(false); // ✅ Track control state

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (drawControlRef.current && isControlAdded) {
        map.removeControl(drawControlRef.current);
        setIsControlAdded(false);
      }
    };
  }, [map, isControlAdded]);

  const enableDrawing = () => {
    if (isDrawingRef.current) return;
    isDrawingRef.current = true;

    // ✅ Only add control if not already added
    if (!isControlAdded) {
      // Create control if not exists
      if (!drawControlRef.current) {
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        const drawControl = new (L.Control as any).Draw({
          position: "topleft",
          draw: {
            polygon: {
              allowIntersection: false,
              shapeOptions: {
                color: "#ff6b35",
                weight: 3,
                fillOpacity: 0.3,
              },
            },
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false,
          },
          edit: {
            featureGroup: drawnItems,
            remove: true,
          },
        });

        drawControlRef.current = drawControl;
      }

      map.addControl(drawControlRef.current);
      setIsControlAdded(true);
    }

    // Enable polygon drawing
    const polygonDrawer = new (L.Draw as any).Polygon(map, {
      shapeOptions: {
        color: "#ff6b35",
        weight: 3,
        fillOpacity: 0.3,
      },
      allowIntersection: false,
    });
    polygonDrawer.enable();

    // Handle polygon creation
    const handleCreated = (e: any) => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      const layer = e.layer as L.Polygon;
      const coordinates = (layer.getLatLngs()[0] as L.LatLng[]).map(
        (ll) => [ll.lat, ll.lng] as [number, number]
      );
      onPolygonSaved(
        layer.bindPopup(`<b>${"Label"}</b>`).getPopup()?.getContent() ||
          "Label",
        coordinates
      );
      isDrawingRef.current = false;
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
  };

  return (
    <button
      onClick={enableDrawing}
      className="absolute top-4 left-4 z-[1000] bg-[#ff6b35] text-white p-3 rounded shadow hover:bg-[#ff8555] transition-colors"
    >
      📍 Label Region
    </button>
  );
}
