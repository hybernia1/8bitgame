/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 * @typedef {import('../data/types.js').LevelMeta} LevelMeta
 */

import { TILE } from '../core/constants.js';
import { placeNpc } from '../data/npcs/index.js';
import { DEFAULT_TILED_IMPORT_OPTIONS } from '../data/tiled-presets.js';
import {
  TILE_DEFINITIONS,
  TILE_IDS,
  getDestroyOverlayTileId,
  getFloorVariantTileId,
  getWallVariantTileId,
} from './tile-registry.js';

const DEFAULT_LAYER_NAMES = {
  collision: 'collision',
  decor: 'decor',
  lighting: 'lighting',
  spawns: 'spawns',
};

const { FLOOR_PLAIN: FLOOR_TILE, WALL_SOLID: WALL_TILE, DOOR_CLOSED: DOOR_TILE } = TILE_IDS;
const DEFAULT_PROPERTY_KEYS = DEFAULT_TILED_IMPORT_OPTIONS.propertyKeys ?? [];
const DEFAULT_TILESET_PRESETS = DEFAULT_TILED_IMPORT_OPTIONS.tilesetDefaults ?? [];
const DEFAULT_VARIANT_MAP = DEFAULT_TILED_IMPORT_OPTIONS.variantMap ?? {};
const DEFAULT_CATEGORY_DEFAULTS = DEFAULT_TILED_IMPORT_OPTIONS.categoryDefaults ?? {};

function isTiledMap(payload) {
  return Boolean(payload && payload.type === 'map' && Array.isArray(payload.layers));
}

function normalizeVariantToken(token) {
  if (typeof token === 'number') return token;

  const stringValue = String(token).trim();
  const numeric = Number.parseInt(stringValue, 10);
  if (!Number.isNaN(numeric)) return numeric;

  const floorMatch = stringValue.match(/^f(\d+)$/i);
  if (floorMatch) {
    return getFloorVariantTileId(Number.parseInt(floorMatch[1], 10));
  }

  const wallMatch = stringValue.match(/^w(\d+)$/i);
  if (wallMatch) {
    return getWallVariantTileId(Number.parseInt(wallMatch[1], 10));
  }

  const destroyMatch = stringValue.match(/^d(\d+)$/i);
  if (destroyMatch) {
    return getDestroyOverlayTileId(Number.parseInt(destroyMatch[1], 10));
  }

  return stringValue.toLowerCase();
}

function buildVariantLookup(custom = {}) {
  const entries = new Map();
  Object.values(TILE_DEFINITIONS).forEach((def) => {
    if (def.variant) entries.set(def.variant.toLowerCase(), def.tileId);
    if (def.id) entries.set(def.id.toLowerCase(), def.tileId);
    entries.set(def.tileId, def.tileId);
  });

  Object.entries(custom).forEach(([token, value]) => {
    entries.set(normalizeVariantToken(token), normalizeVariantToken(value));
  });

  return entries;
}

function buildCategoryDefaults(categoryDefaults, variantLookup) {
  const defaults = new Map();
  Object.entries(categoryDefaults ?? {}).forEach(([category, variant]) => {
    const normalized = normalizeVariantToken(variant);
    const tileId = typeof normalized === 'number' ? normalized : variantLookup.get(normalized);
    if (tileId != null) defaults.set(category.toLowerCase(), tileId);
  });
  if (!defaults.has('wall')) defaults.set('wall', variantLookup.get('wall') ?? WALL_TILE);
  if (!defaults.has('floor')) defaults.set('floor', variantLookup.get('floor') ?? FLOOR_TILE);
  if (!defaults.has('door')) defaults.set('door', variantLookup.get('door') ?? DOOR_TILE);
  if (!defaults.has('decor')) defaults.set('decor', variantLookup.get('decor') ?? variantLookup.get('decor_console') ?? FLOOR_TILE);
  return defaults;
}

function resolveTilesetMatch(tileset, preset) {
  if (!preset) return false;
  const name = tileset.name?.toLowerCase() ?? '';
  const source = tileset.source?.toLowerCase() ?? '';
  if (preset.name && name.includes(preset.name.toLowerCase())) return true;
  if (preset.source && source.includes(preset.source.toLowerCase())) return true;
  if (typeof preset.match === 'function') return Boolean(preset.match(tileset));
  return false;
}

function buildTilesetDefaults(tilesets, presets = []) {
  const defaults = new Map();

  tilesets.forEach((tileset) => {
    const preset = presets.find((candidate) => resolveTilesetMatch(tileset, candidate));
    const properties = readProperties(tileset.properties);
    const merged = {
      ...preset,
      ...properties,
    };
    if (merged.category) merged.category = `${merged.category}`.toLowerCase();
    if (merged.variant) merged.variant = `${merged.variant}`.toLowerCase();
    defaults.set(tileset, merged);
  });

  return defaults;
}

function resolveTileFromProperties(props = {}, { propertyKeys, variantLookup, categoryDefaults }) {
  const keys = propertyKeys ?? DEFAULT_PROPERTY_KEYS;
  for (let i = 0; i < keys.length; i += 1) {
    const value = props[keys[i]];
    if (value == null) continue;
    const normalized = normalizeVariantToken(value);
    const resolved = typeof normalized === 'number' ? normalized : variantLookup.get(normalized);
    if (resolved != null) return resolved;
  }

  const category = props.category ?? props.type;
  if (category) {
    const resolvedCategory = categoryDefaults.get(String(category).toLowerCase());
    if (resolvedCategory != null) return resolvedCategory;
  }

  const variant = props.variant ?? props.material;
  if (variant) {
    const normalizedVariant = normalizeVariantToken(variant);
    if (typeof normalizedVariant === 'number') return normalizedVariant;
    const resolvedVariant = variantLookup.get(normalizedVariant);
    if (resolvedVariant != null) return resolvedVariant;
  }

  return null;
}

function readProperties(properties = []) {
  return properties.reduce((acc, prop) => {
    acc[prop.name] = prop.value;
    return acc;
  }, {});
}

function normalizeLayerData(layer, expectedSize) {
  if (!layer) return new Array(expectedSize).fill(FLOOR_TILE);
  if (layer.type !== 'tilelayer') {
    throw new Error(`Layer "${layer.name}" is not a tile layer.`);
  }

  let raw = layer.data ?? [];
  if (typeof raw === 'string') {
    raw = raw
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => !Number.isNaN(value));
  }

  if (!Array.isArray(raw)) {
    throw new Error(`Layer "${layer.name}" has unsupported data format.`);
  }

  if (raw.length !== expectedSize) {
    throw new Error(
      `Layer "${layer.name}" has ${raw.length} entries, expected ${expectedSize} for ${layer.width}x${layer.height} map.`,
    );
  }

  return raw.map((value) => Number.parseInt(value, 10) || FLOOR_TILE);
}

function resolveTilesetForGid(tilesets = [], gid) {
  return tilesets
    .filter((set) => typeof set.firstgid === 'number')
    .sort((a, b) => (b.firstgid ?? 0) - (a.firstgid ?? 0))
    .find((set) => gid >= set.firstgid);
}

function normalizeTileId(gid, tilesets = []) {
  if (!gid) return FLOOR_TILE;
  const tileset = resolveTilesetForGid(tilesets, gid);
  if (!tileset) return gid;
  return gid - tileset.firstgid;
}

function buildTileMappingMap(mapping = {}) {
  return new Map(
    Object.entries(mapping).map(([key, value]) => [Number.parseInt(key, 10) || key, Number.parseInt(value, 10) || value]),
  );
}

function createTileResolver(mapData, options = {}) {
  const tilesets = mapData.tilesets ?? [];
  const variantLookup = buildVariantLookup(options.variantMap ?? DEFAULT_VARIANT_MAP);
  const categoryDefaults = buildCategoryDefaults(options.categoryDefaults ?? DEFAULT_CATEGORY_DEFAULTS, variantLookup);
  const tilesetDefaults = buildTilesetDefaults(tilesets, options.tilesetDefaults ?? DEFAULT_TILESET_PRESETS);
  const tileMappings = buildTileMappingMap(options.tileMappings ?? {});
  const floorIds = new Set(options.floorTileIds ?? [categoryDefaults.get('floor') ?? FLOOR_TILE]);
  const wallIds = new Set(options.wallTileIds ?? []);
  const doorIds = new Set(options.doorTileIds ?? [categoryDefaults.get('door') ?? DOOR_TILE]);
  const propertyKeys = options.propertyKeys ?? DEFAULT_PROPERTY_KEYS;

  const propertyCache = new Map();

  function getTileProperties(gid, normalizedId, tileset) {
    if (!tileset) return {};
    const cacheKey = `${tileset.firstgid ?? 0}:${normalizedId}`;
    if (propertyCache.has(cacheKey)) return propertyCache.get(cacheKey);

    const tileProps = tileset.tiles?.find((tile) => tile.id === normalizedId)?.properties;
    const merged = { ...(tilesetDefaults.get(tileset) ?? {}), ...readProperties(tileProps) };
    propertyCache.set(cacheKey, merged);
    return merged;
  }

  return (gid) => {
    if (!gid) return categoryDefaults.get('floor') ?? FLOOR_TILE;

    const mapped = tileMappings.get(gid);
    if (mapped != null) return mapped;

    const tileset = resolveTilesetForGid(tilesets, gid);
    const normalizedId = normalizeTileId(gid, tilesets);

    const normalizedMapped = tileMappings.get(normalizedId);
    if (normalizedMapped != null) return normalizedMapped;

    const props = getTileProperties(gid, normalizedId, tileset);
    const propertyResolved = resolveTileFromProperties(props, { propertyKeys, variantLookup, categoryDefaults });
    if (propertyResolved != null) return propertyResolved;

    if (floorIds.has(gid) || floorIds.has(normalizedId)) return categoryDefaults.get('floor') ?? FLOOR_TILE;
    if (doorIds.has(gid) || doorIds.has(normalizedId)) return categoryDefaults.get('door') ?? DOOR_TILE;
    if (wallIds.size === 0) {
      const resolvedCategory = props.category ? categoryDefaults.get(props.category) : null;
      if (resolvedCategory != null) return resolvedCategory;
      return categoryDefaults.get('wall') ?? WALL_TILE;
    }
    if (wallIds.has(gid) || wallIds.has(normalizedId)) return categoryDefaults.get('wall') ?? WALL_TILE;
    return categoryDefaults.get('floor') ?? FLOOR_TILE;
  };
}

function toTileCoords(object) {
  const tx = Math.round((object.x ?? 0) / TILE);
  const ty = Math.round((object.y ?? 0) / TILE);
  return { tx, ty };
}

function parseLightingLayer(layer) {
  if (!layer || layer.type !== 'objectgroup') return { litZones: [], switches: [] };
  const litZones = [];
  const switches = [];

  layer.objects?.forEach((obj) => {
    const props = readProperties(obj.properties);
    const zone = {
      x: Math.round((obj.x ?? 0) / TILE),
      y: Math.round((obj.y ?? 0) / TILE),
      w: Math.round((obj.width ?? 0) / TILE),
      h: Math.round((obj.height ?? 0) / TILE),
    };
    if (obj.type === 'switch' || props.switch) {
      switches.push({
        id: props.id ?? obj.name ?? `${obj.id}`,
        name: props.name ?? obj.name ?? 'Switch',
        ...toTileCoords(obj),
        lights: props.lights ?? [zone],
      });
      return;
    }
    litZones.push(zone);
  });

  return { litZones, switches };
}

function parseSpawnLayer(layer) {
  const actors = { props: [], npcs: [] };
  if (!layer || layer.type !== 'objectgroup') return actors;

  layer.objects?.forEach((obj) => {
    const props = readProperties(obj.properties);
    const common = {
      id: props.id ?? obj.name ?? `${obj.id}`,
      name: props.name ?? obj.name,
      ...toTileCoords(obj),
    };

    if (obj.type === 'player' || props.player) {
      actors.playerStart = {
        tx: common.tx,
        ty: common.ty,
        x: common.tx * TILE + TILE / 2,
        y: common.ty * TILE + TILE / 2,
      };
      return;
    }

    if (obj.type === 'npc' || props.npc) {
      const presetId = props.presetId ?? props.preset ?? props.npcPreset;
      if (presetId) {
        actors.npcs.push(
          placeNpc(presetId, common.tx, common.ty, {
            id: common.id,
            name: common.name,
            sprite: props.sprite,
            dialogue: props.dialogue,
          }),
        );
      } else {
        actors.npcs.push({ ...common, dialogue: props.dialogue, sprite: props.sprite });
      }
      return;
    }

    if (obj.type === 'prop' || props.prop) {
      actors.props.push(common);
    }
  });

  return actors;
}

function findLayer(layers = [], name) {
  return layers.find((layer) => layer.name?.toLowerCase() === name.toLowerCase());
}

/**
 * Convert a Tiled JSON map (CSV/TSX) into the internal LevelConfig shape.
 * @param {any} mapData
 * @param {{ layerNames?: Partial<typeof DEFAULT_LAYER_NAMES>, tileMappings?: Record<string, number>, floorTileIds?: number[], wallTileIds?: number[], doorTileIds?: number[], presets?: Partial<typeof DEFAULT_TILED_IMPORT_OPTIONS> }} [options]
 * @returns {LevelConfig}
 */
export function importTiledLevel(mapData, options = {}) {
  if (!isTiledMap(mapData)) {
    throw new Error('Provided data is not a Tiled JSON map.');
  }

  const layerNames = { ...DEFAULT_LAYER_NAMES, ...(options.layerNames ?? {}) };
  const presetOptions = { ...DEFAULT_TILED_IMPORT_OPTIONS, ...(options.presets ?? {}) };
  const tilesets = mapData.tilesets ?? [];
  const normalizeTileValue = createTileResolver(mapData, {
    ...presetOptions,
    tileMappings: options.tileMappings,
    floorTileIds: options.floorTileIds,
    wallTileIds: options.wallTileIds,
    doorTileIds: options.doorTileIds,
  });

  const width = mapData.width ?? 0;
  const height = mapData.height ?? 0;
  const totalTiles = width * height;

  if (!width || !height) {
    throw new Error('Tiled map is missing width or height.');
  }

  const collisionLayer = findLayer(mapData.layers, layerNames.collision) ?? findLayer(mapData.layers, layerNames.decor);
  const decorLayer = findLayer(mapData.layers, layerNames.decor) ?? collisionLayer;
  const lightingLayer = findLayer(mapData.layers, layerNames.lighting);
  const spawnLayer = findLayer(mapData.layers, layerNames.spawns);

  const rawDecor = normalizeLayerData(decorLayer, totalTiles);
  const rawCollision = collisionLayer === decorLayer ? rawDecor : normalizeLayerData(collisionLayer, totalTiles);

  const decor = rawDecor.map((gid) => normalizeTileValue(gid));
  const collision = rawCollision.map((gid) => normalizeTileValue(gid));

  const lighting = parseLightingLayer(lightingLayer);
  const actors = parseSpawnLayer(spawnLayer);

  const props = readProperties(mapData.properties);
  const parsedLevelNumber = Number.parseInt(props.levelNumber ?? props.levelIndex ?? 0, 10);
  /** @type {LevelMeta} */
  const meta = {
    id: props.id ?? mapData.properties?.find?.((p) => p.name === 'id')?.value ?? mapData.name ?? 'tiled-level',
    name: props.name ?? mapData.name ?? 'Tiled Level',
    title: props.title ?? mapData.name,
    subtitle: props.subtitle,
    levelNumber: Number.isNaN(parsedLevelNumber) ? 0 : parsedLevelNumber,
    dimensions: { width, height },
  };

  return {
    meta,
    dimensions: { width, height },
    width,
    height,
    tileLayers: {
      collision,
      decor,
    },
    lighting,
    actors,
  };
}

/**
 * Normalize an arbitrary module export into a LevelConfig.
 * @param {any} payload
 * @param {{ tiled?: Parameters<typeof importTiledLevel>[1] }} [options]
 * @returns {LevelConfig}
 */
export function normalizeLevelConfig(payload, options = {}) {
  const source = payload?.default ?? payload;
  if (isTiledMap(source)) {
    return importTiledLevel(source, options.tiled);
  }
  return source;
}
