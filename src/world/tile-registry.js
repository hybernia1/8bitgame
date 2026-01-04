/**
 * @typedef {import('../data/types.js').TileDefinition} TileDefinition
 */

export const TILE_IDS = {
  FLOOR_PLAIN: 0,
  WALL_SOLID: 1,
  DOOR_CLOSED: 2,
  DOOR_OPEN: 8,
  WALL_WINDOW: 3,
  WALL_CRACKED: 4,
  FLOOR_LIT: 5,
  DECOR_CONSOLE: 6,
  FLOOR_BROKEN: 7,
};

/** @type {Record<number, TileDefinition>} */
export const TILE_DEFINITIONS = {
  [TILE_IDS.FLOOR_PLAIN]: {
    tileId: TILE_IDS.FLOOR_PLAIN,
    id: 'floor_plain',
    category: 'floor',
    variant: 'floor',
    spriteKey: 'floor',
  },
  [TILE_IDS.WALL_SOLID]: {
    tileId: TILE_IDS.WALL_SOLID,
    id: 'wall_solid',
    category: 'wall',
    variant: 'wall',
    spriteKey: 'wall',
  },
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
  [TILE_IDS.WALL_WINDOW]: {
    tileId: TILE_IDS.WALL_WINDOW,
    id: 'wall_window',
    category: 'wall',
    variant: 'wall_window',
    spriteKey: 'wall.window',
    transparent: true,
    lighting: {
      mask: 'windowCone',
      color: 'rgba(110, 242, 164, 0.3)',
      intensity: 0.65,
      length: 1.35,
      spread: 0.9,
      offsetY: 0.2,
      radius: 2,
    },
  },
  [TILE_IDS.WALL_CRACKED]: {
    tileId: TILE_IDS.WALL_CRACKED,
    id: 'wall_cracked',
    category: 'wall',
    variant: 'wall_cracked',
    spriteKey: 'wall.cracked',
  },
  [TILE_IDS.FLOOR_LIT]: {
    tileId: TILE_IDS.FLOOR_LIT,
    id: 'floor_lit',
    category: 'floor',
    variant: 'floor_lit',
    spriteKey: 'floor.lit',
    lighting: {
      mask: 'glow',
      color: 'rgba(110, 242, 164, 0.28)',
      intensity: 0.45,
      radius: 1,
    },
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
