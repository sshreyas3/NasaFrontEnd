// src/lib/stitchTiles.ts
export async function stitchTilesToImage(
  tiles: { url: string; row: number; col: number }[],
  matrixWidth: number,
  matrixHeight: number,
  tileSize = 256
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = tileSize * matrixWidth;
  canvas.height = tileSize * matrixHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawPromises = tiles.map(async ({ url, row, col }) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      ctx.drawImage(bitmap, col * tileSize, row * tileSize, tileSize, tileSize);
    } catch (e) {
      console.warn("Tile failed:", url);
    }
  });

  await Promise.all(drawPromises);
  return canvas.toDataURL("image/png");
}
