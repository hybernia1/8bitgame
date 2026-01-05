// Central place to tweak how large the canvas renders and how much the
// sprite textures are scaled on screen. Textures are still authored at
// 32x32 (or 64x64) resolution, but the default scale doubles their visible
// size for a crisper presentation.
export const displaySettings = {
  textures: {
    baseTileSize: 32,
    defaultScale: 4,
  },
  world: {
    width: 32,
    height: 18,
  },
  canvas: {
    resolution: {
      width: 4096,
      height: 2304,
    },
  },
};

export function deriveCanvasResolution(tileScale = displaySettings.textures.defaultScale, world = displaySettings.world) {
  const baseTileSize = displaySettings.textures?.baseTileSize ?? 32;
  const defaultScale = Number.isFinite(displaySettings.textures?.defaultScale) && displaySettings.textures.defaultScale > 0
    ? displaySettings.textures.defaultScale
    : 1;
  const width = Number.isFinite(displaySettings.canvas?.resolution?.width)
    ? Math.round((displaySettings.canvas.resolution.width / defaultScale) * tileScale)
    : (world?.width ?? 32) * baseTileSize * tileScale;
  const height = Number.isFinite(displaySettings.canvas?.resolution?.height)
    ? Math.round((displaySettings.canvas.resolution.height / defaultScale) * tileScale)
    : (world?.height ?? 18) * baseTileSize * tileScale;

  return { width, height };
}
