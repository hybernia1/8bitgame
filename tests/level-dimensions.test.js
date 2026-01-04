import assert from 'node:assert/strict';
import test from 'node:test';

import { abandonedLaboratoryLevel, northernWingLevel, rooftopCorridorLevel } from '../src/data/levels/index.js';
import { facilitySample } from '../src/data/maps/facility-sample.js';

function resolveTileLayers(config) {
  const layers = config.tileLayers ?? {};
  const fallback = config.map ?? [];
  const fallbackUnlocked = config.unlockedMap ?? fallback;
  const collision = layers.collision ?? fallback;
  const decor = layers.decor ?? collision;
  return {
    collision: [...collision],
    decor: [...decor],
    collisionUnlocked: [...(layers.collisionUnlocked ?? fallbackUnlocked ?? collision)],
    decorUnlocked: [...(layers.decorUnlocked ?? decor ?? fallbackUnlocked)],
  };
}

function validateLevelDimensions(name, config) {
  const dimensions = config.dimensions ?? config.meta?.dimensions ?? {};
  const width = dimensions.width ?? config.width;
  const height = dimensions.height ?? config.height;

  assert.ok(Number.isInteger(width) && width > 0, `${name}: missing width`);
  assert.ok(Number.isInteger(height) && height > 0, `${name}: missing height`);

  const expectedSize = width * height;
  const layers = resolveTileLayers(config);

  assert.equal(
    layers.collision.length,
    expectedSize,
    `${name}: collision layer length ${layers.collision.length} does not match ${expectedSize}`,
  );
  assert.equal(
    layers.decor.length,
    expectedSize,
    `${name}: decor layer length ${layers.decor.length} does not match ${expectedSize}`,
  );
  assert.equal(
    layers.collisionUnlocked.length,
    expectedSize,
    `${name}: collisionUnlocked layer length ${layers.collisionUnlocked.length} does not match ${expectedSize}`,
  );
  assert.equal(
    layers.decorUnlocked.length,
    expectedSize,
    `${name}: decorUnlocked layer length ${layers.decorUnlocked.length} does not match ${expectedSize}`,
  );
}

test('abandoned laboratory level layers match declared dimensions', () => {
  validateLevelDimensions('abandonedLaboratoryLevel', abandonedLaboratoryLevel);
});

test('northern wing level layers match declared dimensions', () => {
  validateLevelDimensions('northernWingLevel', northernWingLevel);
});

test('rooftop corridor level layers match declared dimensions', () => {
  validateLevelDimensions('rooftopCorridorLevel', rooftopCorridorLevel);
});

test('tiled facility layers match declared dimensions', () => {
  validateLevelDimensions('facilitySample', facilitySample);
});
