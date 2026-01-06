import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_TILED_IMPORT_OPTIONS } from '../src/data/tiled-presets.js';
import { importTiledLevel } from '../src/world/level-loader.js';
import { TILE_IDS } from '../src/world/tile-registry.js';

test('importTiledLevel maps tiled properties and tileset defaults to tile IDs', () => {
  const mapData = {
    type: 'map',
    width: 3,
    height: 1,
    tilewidth: 32,
    tileheight: 32,
    layers: [
      {
        name: 'collision',
        type: 'tilelayer',
        width: 3,
        height: 1,
        data: [1, 101, 0],
      },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: 'Walls',
        properties: [{ name: 'category', value: 'wall' }],
        tiles: [{ id: 0, properties: [{ name: 'material', value: 'wall' }] }],
      },
      {
        firstgid: 101,
        name: 'Floors',
        properties: [
          { name: 'category', value: 'floor' },
          { name: 'variant', value: 'floor_broken' },
        ],
      },
    ],
  };

  const config = importTiledLevel(mapData, { presets: DEFAULT_TILED_IMPORT_OPTIONS });

  assert.equal(config.tileLayers.collision[0], TILE_IDS.WALL_SOLID);
  assert.equal(config.tileLayers.collision[1], TILE_IDS.FLOOR_BROKEN);
  assert.equal(config.tileLayers.collision[2], TILE_IDS.FLOOR_PLAIN);
});
