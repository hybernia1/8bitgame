import assert from 'node:assert/strict';
import test from 'node:test';

import { createCombatSystem } from '../src/systems/combat.js';
import { getDestroyOverlayTileId } from '../src/world/tile-registry.js';

test('projectiles damage destructible decor overlays even on non-blocking tiles', () => {
  const projectiles = [
    { x: 0, y: 0, dx: 1, dy: 0, speed: 10, lifetime: 1 },
  ];
  const damageCalls = [];

  const combatSystem = createCombatSystem({
    ammo: { consume: () => true },
    projectiles,
    player: { x: 0, y: 0, lastDirection: { x: 1, y: 0 } },
    tileAt: () => 0, // Floor tile: not blocking and not destructible by itself.
    damageTile: (x, y) => damageCalls.push({ x, y }),
    getTileLayersAt: () => ({ collision: 0, decor: getDestroyOverlayTileId(1) }),
    showNote: () => {},
  });

  // Advance far enough for the bullet to attempt a hit.
  combatSystem.updateProjectiles(0.1, []);

  assert.equal(projectiles.length, 0, 'projectile should be removed after hitting overlay');
  assert.equal(damageCalls.length, 1, 'damageTile should be called for destructible overlays');
});
