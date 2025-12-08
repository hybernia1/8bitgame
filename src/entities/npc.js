import { TILE } from '../core/constants.js';

const TALK_RADIUS = 26;

export function createNpcs(scene, placements) {
  const { npcs = [] } = placements || {};
  return npcs.map((npc) => {
    const x = npc.x ?? npc.tx * TILE + TILE / 2;
    const y = npc.y ?? npc.ty * TILE + TILE / 2;
    const sprite = scene.add.sprite(x, y, 'npc');
    sprite.setDepth(2);
    const ring = scene.add.graphics();
    ring.lineStyle(2, 0x5cf2cc, 0.6);
    ring.strokeCircle(x, y + 2, TILE / 2);
    ring.setVisible(false);
    ring.setDepth(1);
    return { ...npc, x, y, sprite, ring, nearby: false, hasSpoken: false };
  });
}

export function findNearestNpc(player, npcEntries) {
  let nearest = null;
  let nearestDistance = Infinity;

  npcEntries.forEach((entry) => {
    const dx = entry.x - player.x;
    const dy = entry.y - player.y;
    const distance = Math.hypot(dx, dy);
    entry.nearby = distance <= TALK_RADIUS;
    entry.ring.setVisible(entry.nearby);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = entry;
    }
  });

  return nearest;
}
