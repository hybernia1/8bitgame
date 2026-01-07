import { TILE } from './constants.js';

export function resolveWorldPosition(point = {}, { tileSize = TILE, offset = tileSize / 2, fallback = { x: 0, y: 0 } } = {}) {
  const tx = Number.isFinite(point.tx) ? point.tx : null;
  const ty = Number.isFinite(point.ty) ? point.ty : null;

  return {
    x: point.x ?? (tx != null ? tx * tileSize + offset : fallback.x),
    y: point.y ?? (ty != null ? ty * tileSize + offset : fallback.y),
  };
}
