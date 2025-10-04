// src/components/maps/usePolygonCRUD.ts
"use client";

import { useState, useEffect } from "react";
import { polygonApi, PolygonData } from "@/lib/api";

export function usePolygonCRUD(planet: string, userId: string) {
  const [polygons, setPolygons] = useState<PolygonData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolygons = async () => {
    setLoading(true);
    try {
      const data = await polygonApi.getAll(planet);
      setPolygons(data);
    } catch (err) {
      console.error("Failed to fetch polygons", err);
    } finally {
      setLoading(false);
    }
  };

  const createPolygon = async (
    label: string,
    coordinates: [number, number][]
  ) => {
    try {
      const newPoly = await polygonApi.create({
        label,
        coordinates,
        userId,
        planet,
      });
      setPolygons((prev) => [...prev, newPoly]);
      return newPoly;
    } catch (err) {
      console.error("Failed to save polygon", err);
      throw err;
    }
  };

  const updatePolygon = async (id: string, updates: Partial<PolygonData>) => {
    try {
      const updated = await polygonApi.update(id, updates);
      setPolygons((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      console.error("Failed to update polygon", err);
    }
  };

  const deletePolygon = async (id: string) => {
    try {
      await polygonApi.delete(id);
      setPolygons((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete polygon", err);
    }
  };

  useEffect(() => {
    fetchPolygons();
  }, [planet]);

  return {
    polygons,
    loading,
    createPolygon,
    updatePolygon,
    deletePolygon,
    refetch: fetchPolygons,
  };
}

