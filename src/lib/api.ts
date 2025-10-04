// src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export interface TileInfo {
  url: string;
  row: number;
  col: number;
}

export interface TileUrlsResponse {
  tiles: TileInfo[];
  matrixWidth: number;
  matrixHeight: number;
  tileSize: number;
}

export async function fetchTileUrls(
  lat: number,
  lon: number,
  zoom: number
): Promise<TileUrlsResponse> {
  const res = await fetch(
    `${API_BASE}/api/tile-urls?lat=${lat}&lon=${lon}&zoom=${zoom}`
  );
  if (!res.ok) throw new Error("Failed to fetch tile URLs");
  return res.json();
}
