import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeLevelConfig } from '../src/world/level-loader.js';
import { TILE_IDS } from '../src/world/tile-registry.js';

test('normalizeLevelConfig maps shorthand tokens to tile IDs', () => {
  const config = normalizeLevelConfig({
    meta: { id: 'shorthand-test', name: 'Shorthand Test' },
    dimensions: { width: 3, height: 1 },
    tileLayers: {
      decor: ['F', 'F2', 'F3'],
      collision: ['W', 'W2', 'W3'],
    },
  });

  assert.deepEqual(config.tileLayers.decor, [TILE_IDS.FLOOR_PLAIN, TILE_IDS.FLOOR_LIT, TILE_IDS.FLOOR_BROKEN]);
  assert.deepEqual(config.tileLayers.collision, [TILE_IDS.WALL_SOLID, TILE_IDS.WALL_WINDOW, TILE_IDS.WALL_CRACKED]);
});

test('normalizeLevelConfig falls back to category defaults when shorthand is out of range', () => {
  const config = normalizeLevelConfig({
    meta: { id: 'shorthand-fallback', name: 'Shorthand Fallback' },
    dimensions: { width: 1, height: 2 },
    tileLayers: {
      decor: ['F99'],
      collision: ['W99'],
    },
  });

  assert.equal(config.tileLayers.decor[0], TILE_IDS.FLOOR_PLAIN);
  assert.equal(config.tileLayers.collision[0], TILE_IDS.WALL_SOLID);
});
