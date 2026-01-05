const TILE_BASE = 32;
const DEFAULT_TILE_SCALE = 2;

function resolveTileScale() {
  const globalScale = Number.parseFloat(globalThis?.GAME_TILE_SCALE ?? '');
  if (Number.isFinite(globalScale) && globalScale > 0) return globalScale;

  const queryScale =
    typeof window !== 'undefined'
      ? Number.parseFloat(new URLSearchParams(window.location.search).get('tileScale') ?? '')
      : NaN;
  if (Number.isFinite(queryScale) && queryScale > 0) return queryScale;

  const dataScale =
    typeof document !== 'undefined'
      ? Number.parseFloat(document.documentElement?.dataset?.tileScale ?? '')
      : NaN;
  if (Number.isFinite(dataScale) && dataScale > 0) return dataScale;

  return DEFAULT_TILE_SCALE;
}

export const TILE_SCALE = resolveTileScale();
export const TILE = TILE_BASE * TILE_SCALE;
export const TEXTURE_TILE = TILE_BASE;

export const VIEWPORT = {
  width: 18,
  height: 10,
};

export const WORLD = {
  width: 32,
  height: 18,
};

export const COLORS = {
  wall: '#1f2430',
  wallInner: '#2c3342',
  floor: '#121219',
  floorGlow: 'rgba(92, 242, 204, 0.06)',
  doorClosed: '#2a1b1f',
  doorOpen: '#1c2a20',
  doorAccent: '#f2d45c',
  doorGlow: 'rgba(92, 242, 204, 0.55)',
  gridBackground: '#0b0b10',
  gridBorder: '#0b0c10',
};
