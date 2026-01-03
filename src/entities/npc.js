import { TILE } from '../core/constants.js';
import { createAnimationMap, pickAnimation, resolveDirection } from './characterAnimations.js';

const TALK_RADIUS = 26;
const CHARACTER_SIZE = 22;

function toWorldPosition(point = {}) {
  return {
    x: point.x ?? point.tx * TILE + TILE / 2,
    y: point.y ?? point.ty * TILE + TILE / 2,
  };
}

function updatePatrol(npc, dt) {
  if (!npc.patrolPoints?.length) return { dx: 0, dy: 0, moving: false };

  const target = npc.patrolPoints[npc.patrolIndex];
  const dx = target.x - npc.x;
  const dy = target.y - npc.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 4) {
    npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrolPoints.length;
    return { dx: 0, dy: 0, moving: false };
  }

  const step = (npc.speed ?? 40) * dt;
  const move = Math.min(step, distance);
  const normalizedX = dx / (distance || 1);
  const normalizedY = dy / (distance || 1);
  const facing = resolveDirection(normalizedX, normalizedY, npc.facing);

  npc.lastDirection = { x: normalizedX, y: normalizedY };
  npc.facing = facing;
  npc.x += normalizedX * move;
  npc.y += normalizedY * move;

  return { dx: normalizedX, dy: normalizedY, moving: move > 0 };
}

function updateNpcAnimation(npc, movement, dt) {
  const moving = movement?.moving ?? false;
  const direction = resolveDirection(movement?.dx ?? 0, movement?.dy ?? 0, npc.facing);

  if (moving) {
    npc.facing = direction;
  }

  const nextState = moving ? 'walk' : 'idle';
  const nextAnimation = pickAnimation(npc.animations, nextState, direction) || npc.animation;

  if (npc.animationState !== nextState || npc.currentAnimation !== nextAnimation) {
    npc.currentAnimation?.stop?.();
    npc.currentAnimation = nextAnimation;
    npc.animationState = nextState;
    npc.currentAnimation?.start?.();
  }

  npc.currentAnimation?.update?.(dt);
}

export function createNpcs(spriteSheet, placements) {
  const { npcs = [] } = placements || {};
  return npcs.map((npc) => {
    const spriteName = npc.sprite ?? (npc.lethal ? 'monster' : 'npc');
    const animationBase = npc.animationBase ?? (npc.lethal ? 'player' : spriteName);
    const animations = createAnimationMap(spriteSheet, animationBase);
    const health = npc.health ?? 1;
    const facing = 'down';
    const fallbackAnimation = spriteSheet?.animations?.[spriteName]?.clone?.();
    const currentAnimation =
      pickAnimation(animations, 'idle', facing) ||
      pickAnimation(animations, 'walk', facing) ||
      fallbackAnimation;
    currentAnimation?.start?.();

    return {
      ...npc,
      sprite: spriteName,
      color: npc.color || '#87b0ff',
      tint: npc.tint || 'rgba(135, 176, 255, 0.18)',
      size: npc.size ?? CHARACTER_SIZE,
      ...toWorldPosition(npc),
      patrolPoints: npc.patrol?.map(toWorldPosition) ?? [],
      patrolIndex: 0,
      health,
      maxHealth: health,
      defeated: false,
      hasSpoken: false,
      infoShared: false,
      animation: fallbackAnimation,
      animations,
      facing,
      animationState: currentAnimation ? 'idle' : null,
      currentAnimation,
      lastDirection: { x: 0, y: 1 },
    };
  });
}

export function updateNpcStates(npcs, player, dt) {
  let nearestNpc = null;
  let nearestDistance = Infinity;
  let guardCollision = false;

  npcs.forEach((npc) => {
    if (npc.defeated) return;

    const movement = updatePatrol(npc, dt);
    updateNpcAnimation(npc, movement, dt);

    const distance = Math.hypot(npc.x - player.x, npc.y - player.y);
    npc.nearby = distance <= TALK_RADIUS;

    const npcRadius = (npc.size ?? TILE) / 2;
    if (npc.lethal && distance <= player.size / 2 + npcRadius - 2) {
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
    if (npc.defeated) return;

    const px = npc.x - camera.x;
    const py = npc.y - camera.y;
    const size = npc.size ?? TILE;
    const half = size / 2;
    const activeAnimation = npc.currentAnimation ?? npc.animation;

    ctx.save();
    ctx.translate(px, py);

    ctx.fillStyle = npc.tint;
    ctx.beginPath();
    ctx.arc(0, 2, half, 0, Math.PI * 2);
    ctx.fill();

    if (activeAnimation) {
      activeAnimation.render({ context: ctx, x: -half, y: -half, width: size, height: size });
    } else {
      ctx.fillStyle = npc.color;
      ctx.fillRect(-half, -half, size, size);
    }

    if (npc.name) {
      ctx.fillStyle = '#dbe8ff';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(npc.name, 0, -half - 4);
    }

    if (npc.nearby) {
      ctx.strokeStyle = 'rgba(92, 242, 204, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2, half, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (npc.lethal && npc.maxHealth > 1) {
      const barWidth = size;
      const healthRatio = Math.max(0, npc.health) / npc.maxHealth;
      ctx.translate(-half, -half - 10);
      ctx.fillStyle = '#1a1a22';
      ctx.fillRect(0, 0, barWidth, 6);
      ctx.fillStyle = '#5cf2cc';
      ctx.fillRect(0, 0, barWidth * healthRatio, 6);
      ctx.strokeStyle = '#0b0b10';
      ctx.strokeRect(0, 0, barWidth, 6);
    }

    ctx.restore();
  });
}
