/**
 * @typedef {import('../data/types.js').TileDefinition} TileDefinition
 */

export const TILE_IDS = {
  FLOOR_PLAIN: 0,
  WALL_SOLID: 1,
  DOOR_CLOSED: 2,
  DOOR_OPEN: 8,
  DECOR_CONSOLE: 6,
  FLOOR_BROKEN: 7,
};

const DYNAMIC_FLOOR_BASE = 1000;
const DYNAMIC_WALL_BASE = 2000;
const DYNAMIC_DESTROY_BASE = 3000;
const DYNAMIC_DECOR_BASE = 4000;

function resolveFloorVariantIndex(tileId) {
  if (tileId === TILE_IDS.FLOOR_PLAIN) return 1;
  if (tileId >= DYNAMIC_FLOOR_BASE && tileId < DYNAMIC_WALL_BASE) {
    return tileId - DYNAMIC_FLOOR_BASE;
  }
  return null;
}

function resolveWallVariantIndex(tileId) {
  if (tileId === TILE_IDS.WALL_SOLID) return 1;
  if (tileId >= DYNAMIC_WALL_BASE && tileId < DYNAMIC_DESTROY_BASE) {
    return tileId - DYNAMIC_WALL_BASE;
  }
  return null;
}

function resolveDestroyVariantIndex(tileId) {
  if (tileId >= DYNAMIC_DESTROY_BASE && tileId < DYNAMIC_DECOR_BASE) {
    return tileId - DYNAMIC_DESTROY_BASE;
  }
  return null;
}

function resolveDecorVariantIndex(tileId) {
  if (tileId >= DYNAMIC_DECOR_BASE) return tileId - DYNAMIC_DECOR_BASE;
  return null;
}

function createFloorTileDefinition(tileId) {
  const variantIndex = resolveFloorVariantIndex(tileId);
  if (!variantIndex) return null;

  const variantKey = variantIndex === 1 ? 'floor' : `floor.${variantIndex}`;

  return {
    tileId,
    id: variantIndex === 1 ? 'floor_plain' : `floor_${variantIndex}`,
    category: 'floor',
    variant: variantKey,
    spriteKey: variantKey,
  };
}

function createWallTileDefinition(tileId) {
  const variantIndex = resolveWallVariantIndex(tileId);
  if (!variantIndex) return null;

  const variantKey = variantIndex === 1 ? 'wall' : `wall.${variantIndex}`;

  return {
    tileId,
    id: variantIndex === 1 ? 'wall_solid' : `wall_${variantIndex}`,
    category: 'wall',
    variant: variantKey,
    spriteKey: variantKey,
    blocksMovement: true,
  };
}

function createDestroyTileDefinition(tileId) {
  const variantIndex = resolveDestroyVariantIndex(tileId);
  if (!variantIndex) return null;

  const variantKey = variantIndex === 1 ? 'destroy' : `destroy.${variantIndex}`;

  return {
    tileId,
    id: variantIndex === 1 ? 'destroy_overlay' : `destroy_${variantIndex}`,
    category: 'overlay',
    variant: variantKey,
    spriteKey: variantKey,
    hitPoints: 1,
    blocksMovement: false,
    transparent: true,
  };
}

function createDecorTileDefinition(tileId) {
  const variantIndex = resolveDecorVariantIndex(tileId);
  if (!variantIndex) return null;

  const variantKey = `decor.${variantIndex}`;

  return {
    tileId,
    id: `decor_${variantIndex}`,
    category: 'decor',
    variant: variantKey,
    spriteKey: variantKey,
    blocksMovement: false,
    transparent: true,
  };
}

export function getFloorVariantTileId(variant = 1) {
  const parsed = Number.parseInt(variant, 10);
  const variantIndex = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return variantIndex === 1 ? TILE_IDS.FLOOR_PLAIN : DYNAMIC_FLOOR_BASE + variantIndex;
}

export function getWallVariantTileId(variant = 1) {
  const parsed = Number.parseInt(variant, 10);
  const variantIndex = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return variantIndex === 1 ? TILE_IDS.WALL_SOLID : DYNAMIC_WALL_BASE + variantIndex;
}

export function getDestroyOverlayTileId(variant = 1) {
  const parsed = Number.parseInt(variant, 10);
  const variantIndex = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return DYNAMIC_DESTROY_BASE + variantIndex;
}

export function getDecorVariantTileId(variant = 1) {
  const parsed = Number.parseInt(variant, 10);
  const variantIndex = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return DYNAMIC_DECOR_BASE + variantIndex;
}

export function getFloorVariantIndex(tileId) {
  return resolveFloorVariantIndex(tileId) ?? undefined;
}

export function getWallVariantIndex(tileId) {
  return resolveWallVariantIndex(tileId) ?? undefined;
}

export function getDestroyVariantIndex(tileId) {
  return resolveDestroyVariantIndex(tileId) ?? undefined;
}

export function getDecorVariantIndex(tileId) {
  return resolveDecorVariantIndex(tileId) ?? undefined;
}

/** @type {Record<number, TileDefinition>} */
export const TILE_DEFINITIONS = {
  [TILE_IDS.FLOOR_PLAIN]: createFloorTileDefinition(TILE_IDS.FLOOR_PLAIN),
  [TILE_IDS.WALL_SOLID]: createWallTileDefinition(TILE_IDS.WALL_SOLID),
  [TILE_IDS.DOOR_CLOSED]: {
    tileId: TILE_IDS.DOOR_CLOSED,
    id: 'door_closed',
    category: 'door',
    variant: 'door',
    spriteKey: 'door',
    blocksMovement: true,
  },
  [TILE_IDS.DOOR_OPEN]: {
    tileId: TILE_IDS.DOOR_OPEN,
    id: 'door_open',
    category: 'door',
    variant: 'door_open',
    spriteKey: 'door.open',
    blocksMovement: false,
  },
  [TILE_IDS.DECOR_CONSOLE]: {
    tileId: TILE_IDS.DECOR_CONSOLE,
    id: 'decor_console',
    category: 'decor',
    variant: 'decor_console',
    spriteKey: 'decor.console',
    blocksMovement: false,
  },
  [TILE_IDS.FLOOR_BROKEN]: {
    tileId: TILE_IDS.FLOOR_BROKEN,
    id: 'floor_broken',
    category: 'floor',
    variant: 'floor_broken',
    spriteKey: 'floor.broken',
  },
};

const FALLBACK_TILE = {
  tileId: TILE_IDS.WALL_SOLID,
  id: 'unknown_wall',
  category: 'wall',
  variant: 'wall',
  blocksMovement: true,
};

/**
 * @param {number} tileId
 * @returns {TileDefinition}
 */
export function getTileDefinition(tileId) {
  return (
    TILE_DEFINITIONS[tileId] ??
    createFloorTileDefinition(tileId) ??
    createWallTileDefinition(tileId) ??
    createDestroyTileDefinition(tileId) ??
    createDecorTileDefinition(tileId) ??
    FALLBACK_TILE
  );
}

/**
 * @param {number} tileId
 * @returns {boolean}
 */
export function isBlockingTileId(tileId) {
  const def = getTileDefinition(tileId);
  if (def.blocksMovement != null) return Boolean(def.blocksMovement);
  return def.category === 'wall' || def.category === 'door';
}

/**
 * @param {number} tileId
 * @returns {boolean}
 */
export function isDoorTile(tileId) {
  return getTileDefinition(tileId).category === 'door';
}
