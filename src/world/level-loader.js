/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 * @typedef {import('../data/types.js').LevelMeta} LevelMeta
 */

import { TILE } from '../core/constants.js';

const DEFAULT_LAYER_NAMES = {
  collision: 'collision',
  decor: 'decor',
  lighting: 'lighting',
  spawns: 'spawns',
};

function isTiledMap(payload) {
  return Boolean(payload && payload.type === 'map' && Array.isArray(payload.layers));
}

function readProperties(properties = []) {
  return properties.reduce((acc, prop) => {
    acc[prop.name] = prop.value;
    return acc;
  }, {});
}

function normalizeLayerData(layer, expectedSize) {
  if (!layer) return new Array(expectedSize).fill(0);
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

  return raw.map((value) => Number.parseInt(value, 10) || 0);
}

function resolveTilesetForGid(tilesets = [], gid) {
  return tilesets
    .filter((set) => typeof set.firstgid === 'number')
    .sort((a, b) => (b.firstgid ?? 0) - (a.firstgid ?? 0))
    .find((set) => gid >= set.firstgid);
}

function normalizeTileId(gid, tilesets = []) {
  if (!gid) return 0;
  const tileset = resolveTilesetForGid(tilesets, gid);
  if (!tileset) return gid;
  return gid - tileset.firstgid;
}

function normalizeTileValue(gid, { tilesets, tileMappings, floorIds, wallIds, doorIds }) {
  if (!gid) return 0;
  const mapped = tileMappings.get(gid);
  if (mapped != null) return mapped;

  const normalizedId = normalizeTileId(gid, tilesets);
  const normalizedMapped = tileMappings.get(normalizedId);
  if (normalizedMapped != null) return normalizedMapped;

  if (floorIds.has(gid) || floorIds.has(normalizedId)) return 0;
  if (doorIds.has(gid) || doorIds.has(normalizedId)) return 2;
  if (wallIds.size === 0) return 1;
  if (wallIds.has(gid) || wallIds.has(normalizedId)) return 1;
  return 0;
}

function buildTileMappingMap(mapping = {}) {
  return new Map(
    Object.entries(mapping).map(([key, value]) => [Number.parseInt(key, 10) || key, Number.parseInt(value, 10) || value]),
  );
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
  const actors = { monsters: [], props: [], npcs: [] };
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
        x: common.tx * TILE + TILE / 2,
        y: common.ty * TILE + TILE / 2,
      };
      return;
    }

    if (obj.type === 'npc' || props.npc) {
      actors.npcs.push({ ...common, dialogue: props.dialogue, sprite: props.sprite });
      return;
    }

    if (obj.type === 'monster' || props.monster) {
      actors.monsters.push({ ...common, patrol: props.patrol });
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
 * @param {{ layerNames?: Partial<typeof DEFAULT_LAYER_NAMES>, tileMappings?: Record<string, number>, floorTileIds?: number[], wallTileIds?: number[], doorTileIds?: number[] }} [options]
 * @returns {LevelConfig}
 */
export function importTiledLevel(mapData, options = {}) {
  if (!isTiledMap(mapData)) {
    throw new Error('Provided data is not a Tiled JSON map.');
  }

  const layerNames = { ...DEFAULT_LAYER_NAMES, ...(options.layerNames ?? {}) };
  const tilesets = mapData.tilesets ?? [];
  const tileMappings = buildTileMappingMap(options.tileMappings ?? {});
  const floorIds = new Set(options.floorTileIds ?? []);
  const wallIds = new Set(options.wallTileIds ?? []);
  const doorIds = new Set(options.doorTileIds ?? []);

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

  const decor = rawDecor.map((gid) => normalizeTileValue(gid, { tilesets, tileMappings, floorIds, wallIds, doorIds }));
  const collision = rawCollision.map((gid) => normalizeTileValue(gid, { tilesets, tileMappings, floorIds, wallIds, doorIds }));

  const lighting = parseLightingLayer(lightingLayer);
  const actors = parseSpawnLayer(spawnLayer);

  const props = readProperties(mapData.properties);
  /** @type {LevelMeta} */
  const meta = {
    id: props.id ?? mapData.properties?.find?.((p) => p.name === 'id')?.value ?? mapData.name ?? 'tiled-level',
    name: props.name ?? mapData.name ?? 'Tiled Level',
    title: props.title ?? mapData.name,
    subtitle: props.subtitle,
    levelNumber: props.levelNumber ?? Number.parseInt(props.levelIndex ?? 0, 10) || 0,
  };

  return {
    meta,
    width,
    height,
    tileLayers: {
      collision,
      decor,
      collisionUnlocked: collision,
      decorUnlocked: decor,
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
