import { TILE } from '../core/constants.js';

const TALK_RADIUS = 26;

export function createNpcs(spriteSheet, placements) {
  const { npcs = [] } = placements || {};
  return npcs.map((npc) => ({
    ...npc,
    x: npc.x ?? npc.tx * TILE + TILE / 2,
    y: npc.y ?? npc.ty * TILE + TILE / 2,
    hasSpoken: false,
    animation: spriteSheet?.animations?.npc?.clone?.(),
  }));
}

export function updateNpcStates(npcs, player) {
  let nearestNpc = null;
  let nearestDistance = Infinity;

  npcs.forEach((npc) => {
    const distance = Math.hypot(npc.x - player.x, npc.y - player.y);
    npc.nearby = distance <= TALK_RADIUS;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestNpc = npc;
    }
  });

  return { nearestNpc };
}

export function drawNpcs(ctx, camera, npcs) {
  npcs.forEach((npc) => {
    const px = npc.x - camera.x;
    const py = npc.y - camera.y;
    const half = TILE / 2;
    if (npc.animation) {
      npc.animation.render({ context: ctx, x: px - half, y: py - half, width: TILE, height: TILE });
    } else {
      ctx.fillStyle = '#87b0ff';
      ctx.fillRect(px - half, py - half, TILE, TILE);
    }
    if (npc.nearby) {
      ctx.strokeStyle = 'rgba(92, 242, 204, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py + 2, TILE / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}
