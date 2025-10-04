// // src/lib/api.ts
// const API_BASE = "/api/polygons"; // or your backend URL

// export type PolygonData = {
//   id: string;
//   label: string;
//   coordinates: [number, number][]; // [lat, lng]
//   userId: string;
//   planet: string; // e.g., "mars", "earth"
// };

// export const polygonApi = {
//   async create(data: Omit<PolygonData, "id">): Promise<PolygonData> {
//     const res = await fetch(API_BASE, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data),
//     });
//     return res.json();
//   },

//   async getAll(planet: string): Promise<PolygonData[]> {
//     const res = await fetch(`${API_BASE}?planet=${planet}`);
//     return res.json();
//   },

//   async update(id: string, data: Partial<PolygonData>): Promise<PolygonData> {
//     const res = await fetch(`${API_BASE}/${id}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(data),
//     });
//     return res.json();
//   },

//   async delete(id: string): Promise<void> {
//     await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
//   },
// };

// src/lib/api.ts

// src/lib/api.ts

export type PolygonData = {
  id: string;
  label: string;
  coordinates: [number, number][];
  userId: string;
  planet: string;
};

// Use localStorage for persistence during dev
const STORAGE_KEY = "polygon-data";

function getStored(): PolygonData[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveStored(data: PolygonData[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

// Simulate network delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const polygonApi = {
  async create(data: Omit<PolygonData, "id">): Promise<PolygonData> {
    await delay(300);
    const newPoly = { ...data, id: Date.now().toString() };
    const current = getStored();
    saveStored([...current, newPoly]);
    return newPoly;
  },

  async getAll(planet: string): Promise<PolygonData[]> {
    await delay(200);
    return getStored().filter((p) => p.planet === planet);
  },

  async update(
    id: string,
    updates: Partial<PolygonData>
  ): Promise<PolygonData> {
    await delay(250);
    const current = getStored();
    const updated = current.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    saveStored(updated);
    return updated.find((p) => p.id === id)!;
  },

  async delete(id: string): Promise<void> {
    await delay(200);
    const current = getStored();
    saveStored(current.filter((p) => p.id !== id));
  },
};
