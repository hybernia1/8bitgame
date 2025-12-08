import { TILE } from '../core/constants.js';

const TALK_RADIUS = 26;

function toWorldPosition(point = {}) {
  return {
    x: point.x ?? point.tx * TILE + TILE / 2,
    y: point.y ?? point.ty * TILE + TILE / 2,
  };
}

function updatePatrol(npc, dt) {
  if (!npc.patrolPoints?.length) return;

  const target = npc.patrolPoints[npc.patrolIndex];
  const dx = target.x - npc.x;
  const dy = target.y - npc.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 4) {
    npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrolPoints.length;
    return;
  }

  const step = (npc.speed ?? 40) * dt;
  const scale = Math.min(step, distance) / (distance || 1);
  npc.x += dx * scale;
  npc.y += dy * scale;
}

export function createNpcs(spriteSheet, placements) {
  const { npcs = [] } = placements || {};
  return npcs.map((npc) => ({
    ...npc,
    ...toWorldPosition(npc),
    patrolPoints: npc.patrol?.map(toWorldPosition) ?? [],
    patrolIndex: 0,
    hasSpoken: false,
    infoShared: false,
    animation: spriteSheet?.animations?.npc?.clone?.(),
  }));
}

export function updateNpcStates(npcs, player, dt) {
  let nearestNpc = null;
  let nearestDistance = Infinity;
  let guardCollision = false;

  npcs.forEach((npc) => {
    updatePatrol(npc, dt);

    const distance = Math.hypot(npc.x - player.x, npc.y - player.y);
    npc.nearby = distance <= TALK_RADIUS;

    if (npc.lethal && distance <= player.size / 2 + TILE / 2 - 2) {
      guardCollision = true;
    }

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestNpc = npc;
    }
  });

  return { nearestNpc, guardCollision };
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
