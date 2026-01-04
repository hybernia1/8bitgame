/**
 * @typedef {import('../data/types.js').TileDefinition} TileDefinition
 */

export const TILE_IDS = {
  FLOOR_PLAIN: 0,
  WALL_SOLID: 1,
  DOOR_CLOSED: 2,
  WALL_WINDOW: 3,
  WALL_CRACKED: 4,
  FLOOR_LIT: 5,
  DECOR_CONSOLE: 6,
};

/** @type {Record<number, TileDefinition>} */
export const TILE_DEFINITIONS = {
  [TILE_IDS.FLOOR_PLAIN]: {
    tileId: TILE_IDS.FLOOR_PLAIN,
    id: 'floor_plain',
    category: 'floor',
    variant: 'floor',
  },
  [TILE_IDS.WALL_SOLID]: {
    tileId: TILE_IDS.WALL_SOLID,
    id: 'wall_solid',
    category: 'wall',
    variant: 'wall',
  },
  [TILE_IDS.DOOR_CLOSED]: {
    tileId: TILE_IDS.DOOR_CLOSED,
    id: 'door_closed',
    category: 'door',
    variant: 'door',
    blocksMovement: true,
  },
  [TILE_IDS.WALL_WINDOW]: {
    tileId: TILE_IDS.WALL_WINDOW,
    id: 'wall_window',
    category: 'wall',
    variant: 'wall_window',
    transparent: true,
  },
  [TILE_IDS.WALL_CRACKED]: {
    tileId: TILE_IDS.WALL_CRACKED,
    id: 'wall_cracked',
    category: 'wall',
    variant: 'wall_cracked',
  },
  [TILE_IDS.FLOOR_LIT]: {
    tileId: TILE_IDS.FLOOR_LIT,
    id: 'floor_lit',
    category: 'floor',
    variant: 'floor_lit',
  },
  [TILE_IDS.DECOR_CONSOLE]: {
    tileId: TILE_IDS.DECOR_CONSOLE,
    id: 'decor_console',
    category: 'decor',
    variant: 'decor_console',
    blocksMovement: false,
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
  return TILE_DEFINITIONS[tileId] ?? FALLBACK_TILE;
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
