import { TILE_DEFINITIONS, TILE_IDS } from '../world/tile-registry.js';

const DEFAULT_VARIANT_ALIASES = {
  wall: TILE_IDS.WALL_SOLID,
  floor: TILE_IDS.FLOOR_PLAIN,
  door: TILE_IDS.DOOR_CLOSED,
  door_closed: TILE_IDS.DOOR_CLOSED,
};

const BUILTIN_VARIANT_MAP = Object.values(TILE_DEFINITIONS).reduce((acc, def) => {
  const tileId = def.tileId;
  if (def.id) acc[def.id] = tileId;
  if (def.variant) acc[def.variant] = tileId;
  if (def.category && DEFAULT_VARIANT_ALIASES[def.category] == null) {
    acc[def.category] = tileId;
  }
  return acc;
}, { ...DEFAULT_VARIANT_ALIASES });

export const TILE_VARIANT_MAP = {
  ...BUILTIN_VARIANT_MAP,
  wall_cracked: TILE_IDS.WALL_CRACKED,
  wall_window: TILE_IDS.WALL_WINDOW,
  floor_broken: TILE_IDS.FLOOR_BROKEN,
  decor_console: TILE_IDS.DECOR_CONSOLE,
};

export const TILE_CATEGORY_DEFAULTS = {
  wall: TILE_VARIANT_MAP.wall,
  floor: TILE_VARIANT_MAP.floor,
  door: TILE_VARIANT_MAP.door,
  decor: TILE_VARIANT_MAP.decor_console,
};

export const TILE_PROPERTY_KEYS = ['tileId', 'tile', 'variant', 'material', 'type', 'category'];

export const TILESET_DEFAULTS = [
  { name: 'wall', category: 'wall' },
  { name: 'floor', category: 'floor' },
  { name: 'door', category: 'door' },
  { name: 'decor', category: 'decor' },
];

export const DEFAULT_TILED_IMPORT_OPTIONS = {
  propertyKeys: TILE_PROPERTY_KEYS,
  tilesetDefaults: TILESET_DEFAULTS,
  variantMap: TILE_VARIANT_MAP,
  categoryDefaults: TILE_CATEGORY_DEFAULTS,
};
