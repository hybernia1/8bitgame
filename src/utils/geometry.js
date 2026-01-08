import { TILE } from '../core/constants.js';

const resolveSize = (sizeOrEntity) => {
  if (typeof sizeOrEntity === 'number') return sizeOrEntity;
  if (sizeOrEntity && typeof sizeOrEntity === 'object') {
    if (typeof sizeOrEntity.size === 'number') return sizeOrEntity.size;
    if (typeof sizeOrEntity.width === 'number') return sizeOrEntity.width;
  }
  return TILE;
};

export function overlapsEntity(x1, y1, size1, x2, y2, size2) {
  const resolvedSize1 = resolveSize(size1);
  const resolvedSize2 = resolveSize(size2);
  const half1 = resolvedSize1 / 2;
  const half2 = resolvedSize2 / 2;
  return Math.abs(x1 - x2) < half1 + half2 && Math.abs(y1 - y2) < half1 + half2;
}

export function isOccupyingTile(entity, tx, ty) {
  if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number') return false;
  const size = resolveSize(entity);
  const halfEntity = size / 2;
  const halfTile = TILE / 2;
  const cx = tx * TILE + halfTile;
  const cy = ty * TILE + halfTile;
  return Math.abs(entity.x - cx) < halfTile + halfEntity && Math.abs(entity.y - cy) < halfTile + halfEntity;
}
