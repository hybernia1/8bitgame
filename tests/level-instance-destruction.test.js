import assert from 'node:assert/strict';
import test from 'node:test';

import { LevelInstance } from '../src/world/level-instance.js';
import { TILE_IDS, getDestroyOverlayTileId, getFloorVariantTileId, getWallVariantTileId } from '../src/world/tile-registry.js';

test('destroying a destructible tile reveals its configured floor', () => {
  const collisionTile = getWallVariantTileId(6);
  const overlayTile = getDestroyOverlayTileId(1);
  const revealedFloor = getFloorVariantTileId(2);

  const level = new LevelInstance({
    meta: { name: 'Test Sector' },
    dimensions: { width: 1, height: 1 },
    tileLayers: {
      collision: [collisionTile],
      decor: [overlayTile],
      destroyedFloors: [revealedFloor],
    },
    actors: {},
  });

  const wasDamaged = level.damageTileAt(0, 0, 2);

  assert.equal(wasDamaged, true);
  assert.equal(level.collisionTiles[0], revealedFloor);
  assert.equal(level.decorTiles[0], revealedFloor);
  assert.equal(level.destructibleTiles.has(0), false);
});

test('defaults to plain floor when no destroyed floor is configured', () => {
  const collisionTile = getWallVariantTileId(1);
  const overlayTile = getDestroyOverlayTileId(1);

  const level = new LevelInstance({
    meta: { name: 'Test Sector' },
    dimensions: { width: 1, height: 1 },
    tileLayers: {
      collision: [collisionTile],
      decor: [overlayTile],
      destroyedFloors: [null],
    },
    actors: {},
  });

  level.damageTileAt(0, 0, 2);

  assert.equal(level.collisionTiles[0], TILE_IDS.FLOOR_PLAIN);
  assert.equal(level.decorTiles[0], TILE_IDS.FLOOR_PLAIN);
});
