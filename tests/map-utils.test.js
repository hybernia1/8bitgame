import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTileLayersFromTokens } from '../src/data/levels/map-utils.js';
import {
  TILE_IDS,
  getDestroyOverlayTileId,
  getFloorVariantTileId,
  getWallVariantTileId,
} from '../src/world/tile-registry.js';

test('buildTileLayersFromTokens maps composite destroy tokens to decor overlays', () => {
  const { collision, decor, destroyedFloors } = buildTileLayersFromTokens(['W1D1']);

  assert.equal(collision[0], getWallVariantTileId(1));
  assert.equal(decor[0], getDestroyOverlayTileId(1));
  assert.equal(destroyedFloors[0], TILE_IDS.FLOOR_PLAIN);
});

test('composite destroy tokens can set a custom floor to reveal', () => {
  const { collision, decor, destroyedFloors } = buildTileLayersFromTokens(['W6D1F2']);

  assert.equal(collision[0], getWallVariantTileId(6));
  assert.equal(decor[0], getDestroyOverlayTileId(1));
  assert.equal(destroyedFloors[0], getFloorVariantTileId(2));
});

test('unsupported legacy tokens fall back to the default base tile', () => {
  const { collision, decor, destroyedFloors } = buildTileLayersFromTokens(['WC']);

  assert.equal(collision[0], TILE_IDS.FLOOR_PLAIN);
  assert.equal(decor[0], TILE_IDS.FLOOR_PLAIN);
  assert.equal(destroyedFloors[0], null);
});
